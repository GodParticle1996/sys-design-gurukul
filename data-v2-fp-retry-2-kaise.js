/* First Principles — FAANG Senior Engineer.
   Source credit: Mathematics of the Second Attempt (s5HWkMyRRcA), numbered video 12/15.
   Evidence: docker-labs/62-second-attempt/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "c1", "icon": "📱", "label": "Client 1", "x": 120, "y": 70}, {"id": "c2", "icon": "📱", "label": "Client 2", "x": 120, "y": 190}, {"id": "c3", "icon": "📱", "label": "Client 3", "x": 120, "y": 310}, {"id": "row", "icon": "🗄️", "label": "Ek hi row", "x": 520, "y": 190}, {"id": "clock", "icon": "⏱️", "label": "Backoff", "x": 800, "y": 190}];
const EDGES = [{"from": "c1", "to": "row"}, {"from": "c2", "to": "row"}, {"from": "c3", "to": "row"}, {"from": "row", "to": "clock"}];
VISUALS["fp-retry-kaise"] = { t: "Backoff intezaar badhata hai; jitter clients ko alag samay par bhejta hai.", html: SD.viz.svg(HERO, EDGES, { nodes: { c1: {tone:'ok',badge:'3 ms'}, c2: {tone:'ok',badge:'jeeta'}, c3: {tone:'ok',badge:'17 ms'}, row: {tone:'ok',badge:'line'}, clock: {tone:'ok',badge:'random'} } }, {w:900,h:400}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-retry-kaise",
  "icon": "⏱️",
  "group": "🔁 Retries: Doosri Koshish",
  "title": "Retries 2 · Kaise — backoff, jitter aur cap",
  "badge": "Bheed Ka Bikhraane Wala",
  "objectives": [
    "Bina jitter backoff kyun haarta hai",
    "Chhota, equal, full aur decorrelated jitter",
    "Cap, retry kis error par, Retry-After"
  ],
  "lesson": [
    "<h3>🚪 Mandir ka darwaaza</h3><p>Mela khatam, 100 log ek hi chhote darwaaze se nikalna chahte hain. Sab ek saath dhakka dete hain — ek nikalta hai. Guard bolta hai \"2 minute baad aana\". 2 minute baad 99 log phir ek saath.</p><p>Guard agar har kisi ko alag samay bole — kisi ko 1 minute, kisi ko 3 — toh darwaaze par line chalti rehti hai. Aaj dekhte hain \"alag samay\" kaise chunein.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "⏱️ 100 log, ek darwaaza — kab dobara aayein?",
      "goal": "Lab 62 ex1 (saral slot model, seeded, 20 runs ka ausat; Brooker ke AWS simulation se prerit, Brooker ke simulation ki nakal nahi): saare clients t = 0 par ek hi row likhte hain. Ek 1 ms slot mein kai calls aayein toh ek jeetti hai, baaki fail hokar backoff. Backoff = min(1 s, 10 ms × 2^koshish), har retry par 0–4 ms ka network farq.",
      "nodes": [
        {
          "id": "c1",
          "icon": "📱",
          "label": "Client 1",
          "x": 120,
          "y": 70
        },
        {
          "id": "c2",
          "icon": "📱",
          "label": "Client 2",
          "x": 120,
          "y": 190
        },
        {
          "id": "c3",
          "icon": "📱",
          "label": "Client 3",
          "x": 120,
          "y": 310
        },
        {
          "id": "row",
          "icon": "🗄️",
          "label": "Ek hi row",
          "x": 520,
          "y": 190
        },
        {
          "id": "clock",
          "icon": "⏱️",
          "label": "Backoff",
          "x": 800,
          "y": 190
        }
      ],
      "edges": [
        {
          "from": "c1",
          "to": "row"
        },
        {
          "from": "c2",
          "to": "row"
        },
        {
          "from": "c3",
          "to": "row"
        },
        {
          "from": "row",
          "to": "clock"
        }
      ],
      "viz": {
        "w": 900,
        "h": 400
      },
      "vars": [
        {
          "id": "way",
          "label": "Tareeka"
        },
        {
          "id": "calls",
          "label": "100 clients: calls"
        },
        {
          "id": "time",
          "label": "Sab khatam"
        }
      ],
      "steps": [
        {
          "title": "Sab ek saath",
          "clock": "t = 0",
          "say": "t = 0: 100 calls ek hi slot mein. Ek jeeti, 99 fail.",
          "nodes": {
            "c1": {
              "tone": "bad",
              "badge": "fail"
            },
            "c2": {
              "tone": "ok",
              "badge": "jeeta"
            },
            "c3": {
              "tone": "bad",
              "badge": "fail"
            },
            "row": {
              "tone": "busy",
              "badge": "100 ek saath"
            },
            "clock": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "way": "—",
            "calls": "100",
            "time": "—"
          },
          "flows": [
            {
              "from": "c1",
              "to": "row",
              "label": "",
              "tone": "bad"
            },
            {
              "from": "c2",
              "to": "row",
              "label": "",
              "tone": "ok"
            },
            {
              "from": "c3",
              "to": "row",
              "label": "",
              "tone": "bad"
            }
          ]
        },
        {
          "title": "Backoff, jitter nahi",
          "clock": "jitter nahi",
          "say": "99 clients ~20 ms rukte hain (bas 0–4 ms network ka farq) — lagbhag ek saath lautte. Lab: 737 calls, 8.1 s. Network farq bhi na ho toh har round mein ek hi jeetta: 5,050 calls.",
          "nodes": {
            "c1": {
              "tone": "bad",
              "badge": "20 ms"
            },
            "c2": {
              "tone": "ok",
              "badge": ""
            },
            "c3": {
              "tone": "bad",
              "badge": "20 ms"
            },
            "row": {
              "tone": "bad",
              "badge": "phir 99 saath"
            },
            "clock": {
              "tone": "busy",
              "badge": "same samay"
            }
          },
          "vars": {
            "way": "exponential, jitter nahi",
            "calls": "737",
            "time": "8.1 s"
          },
          "ask": {
            "q": "Backoff toh tha, phir bhi 737 calls aur 8 s kyun?",
            "choices": [
              "Sab lagbhag ek saath lautte; ek slot mein ek hi jeetta, baaki phir fail",
              "Backoff ka cap 1 s hai, isliye clients jaldi thak kar baar-baar aate",
              "Row lock bahut dheema hai, isliye har call 94 ms leti hai"
            ],
            "answer": 0,
            "hint": "99 clients ka backoff kitna alag hai?",
            "explain": "Bina jitter sabka backoff ek jaisa: sab lagbhag ek saath lautte, phir ek slot mein ek jeetta, baaki phir saath. Network ka farq bhi na ho toh 100 + 99 + … + 1 = 5,050 calls. Video sahi: jitter ke bina backoff \"clear loser\" (Brooker, AWS 2015).",
            "choiceExplanations": [
              "Bina jitter sabka backoff ek jaisa: sab lagbhag ek saath lautte, phir ek slot mein ek jeetta, baaki phir saath. Network ka farq bhi na ho toh 100 + 99 + … + 1 = 5,050 calls. Video sahi: jitter ke bina backoff \"clear loser\" (Brooker, AWS 2015).",
              "Cap se fark nahi: sabka cap bhi ek jaisa.",
              "Model mein har slot 1 ms; problem takkar ki hai."
            ]
          }
        },
        {
          "title": "Chhota jitter",
          "clock": "chhota jitter",
          "say": "Video: \"2 s plus thoda\" — backoff × 0.8–1.2. Lab: 391 calls, 0.75 s. Bheed bahut tooti.",
          "nodes": {
            "c1": {
              "tone": "busy",
              "badge": "18 ms"
            },
            "c2": {
              "tone": "ok",
              "badge": ""
            },
            "c3": {
              "tone": "busy",
              "badge": "23 ms"
            },
            "row": {
              "tone": "busy",
              "badge": "thoda phaila"
            },
            "clock": {
              "tone": "ok",
              "badge": "±20%"
            }
          },
          "vars": {
            "way": "backoff × 0.8–1.2",
            "calls": "391",
            "time": "753 ms"
          }
        },
        {
          "title": "Full jitter",
          "clock": "full jitter",
          "say": "Sleep = random(0, backoff). Lab: 350 calls, 0.35 s. Decorrelated (random(10 ms, pichhla × 3)): 326 calls, 0.30 s. Inka aapsi kram is model mein slot ki chaudai par tika hai.",
          "nodes": {
            "c1": {
              "tone": "ok",
              "badge": "3 ms"
            },
            "c2": {
              "tone": "ok",
              "badge": ""
            },
            "c3": {
              "tone": "ok",
              "badge": "17 ms"
            },
            "row": {
              "tone": "ok",
              "badge": "phaila hua"
            },
            "clock": {
              "tone": "ok",
              "badge": "random"
            }
          },
          "vars": {
            "way": "random(0, backoff)",
            "calls": "350",
            "time": "346 ms"
          },
          "ask": {
            "q": "Lab ka chhota jitter (±20%) bhi madad karta hai. Full jitter chhote jitter se kam takkar kyun deta hai?",
            "choices": [
              "Full jitter 0 se backoff tak bikhraata; kam takkar, toh kam retries",
              "Chhota jitter cap ko hata deta hai, full jitter cap wapas laata hai",
              "Full jitter mein har client ki retry ki had kam rakhi gayi hai"
            ],
            "answer": 0,
            "hint": "1 ms slot mein ±20% ka matlab kitne alag slots?",
            "explain": "Bina jitter sab ek slot mein. ±20% bhi clients ko kai slots mein baant deta hai — bahut kam takkar. Full jitter 0 se backoff tak poori range use karta hai, toh aur kam takkar — aur kam takkar ka matlab kam retries. Is model mein decorrelated aur bhi kam calls leta hai; kram workload par tika hai.",
            "choiceExplanations": [
              "Bina jitter sab ek slot mein. ±20% bhi clients ko kai slots mein baant deta hai — bahut kam takkar. Full jitter 0 se backoff tak poori range use karta hai, toh aur kam takkar — aur kam takkar ka matlab kam retries. Is model mein decorrelated aur bhi kam calls leta hai; kram workload par tika hai.",
              "Cap dono mein 1 s hai.",
              "Retry ki had dono mein same (jab tak jeete); farq takkar ka hai."
            ]
          }
        }
      ],
      "lesson": "Backoff intezaar badhata hai; jitter clients ko alag samay par bhejta hai. Bina jitter backoff sabse bura. Default: full jitter, random(0, min(cap, base × 2^koshish))."
    },
    {
      "type": "cards",
      "title": "🎛️ Backoff ke knobs",
      "goal": "Cap, retry kis error par, aur Retry-After. Video ki baatein sudhaar ke saath.",
      "lesson": "Backoff = cap ke saath exponential + jitter. Retry sirf asthaayi errors par, aur server ka Retry-After maano.",
      "steps": [
        {
          "title": "1. Cap",
          "say": "2^10 s ≈ 17 minute — video sahi, cap chahiye. Video kehta hai AWS guidance 30–60 s; AWS SDKs ka standard retry mode max backoff 20 s rakhta hai. Cap aur koshishon ki ginti ko user ki deadline mein fit karo (level 4)."
        },
        {
          "title": "2. Kaun se errors",
          "say": "Retry: timeout, connection reset, 503, 429. Mat karo: 400 (galat request), 401/403, 404 — dobara bhejne se jawab nahi badlega. 409 ka matlab dekho: \"same key abhi chal raha\" par ruk kar same key aur parameters se retry theek (Stripe bhi aisa kehta hai); parameter ka takraav jaanch maangta hai.",
          "ask": {
            "q": "Payment API ne 400 \"card number galat\" diya. Client 3 baar backoff ke saath retry karta hai. Kya galat?",
            "choices": [
              "400 asthaayi nahi; retry se jawab nahi badlega, sirf bojh aur der",
              "Kuch nahi — 3 retries achha default hai har error ke liye",
              "Retry theek, bas jitter nahi tha, isliye fail hua hoga"
            ],
            "answer": 0,
            "hint": "Galat card number dobara bhejne se kya badlega?",
            "explain": "4xx aksar request ki galti hai: dobara bhejne se same jawab. Retry sirf asthaayi errors par (timeout, 503, 429, aur \"abhi chal raha\" wala 409 ruk kar). Har error par retry = bekaar bojh aur user ka intezaar.",
            "choiceExplanations": [
              "4xx aksar request ki galti hai: dobara bhejne se same jawab. Retry sirf asthaayi errors par (timeout, 503, 429, aur \"abhi chal raha\" wala 409 ruk kar). Har error par retry = bekaar bojh aur user ka intezaar.",
              "Har error par retry bojh badhata hai; 400 par bekaar.",
              "Jitter takkar todta hai; galat card number nahi."
            ]
          }
        },
        {
          "title": "3. Retry-After",
          "say": "Server 429 ya 503 ke saath Retry-After bhej sakta hai (\"itni der baad aana\"). Client ko apne backoff se zyada server ki baat maanni chahiye. Lab 37 ex2 asli server par Retry-After dikhata hai."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Jitter ka mukabla",
      "project": "62-second-attempt",
      "exercise": "ex1-jitter",
      "goal": "Paanch strategies, 20 aur 100 clients: kitni calls aur kitna samay.",
      "why": "Node 24+ chahiye. Seeded model (20 runs ka ausat), har run same. Asli servers par jitter: lab 37 ex1.",
      "steps": [
        {
          "text": "Jitter.",
          "cmd": "cd docker-labs/62-second-attempt && npm start -- ex1-jitter",
          "expect": "MODEL (seeded, 20 runs ka ausat): saral \"slot\" model — Brooker (AWS, 2015) ke OCC simulation se prerit, uski nakal nahi.\nSaare clients t = 0 par ek hi row likhte hain. Har 1 ms slot mein kai calls aayein toh EK jeetti hai, baaki fail hokar backoff.\nBackoff = min(1 s, 10 ms × 2^koshish). Har retry par 0–4 ms ka random network delay bhi.\n\ntareeka                                                   20 clients: calls / samay     100 clients: calls / samay\njitter nahi (sirf exponential)                                69 /   617 ms           737 /    8.1 s\nchhota jitter: backoff × 0.8–1.2 (video ka \"2 s + thoda\")     51 /   157 ms           391 /   753 ms\nequal jitter: aadha + random(0, aadha)                        50 /   112 ms           371 /   492 ms\nfull jitter: random(0, backoff)                               46 /    68 ms           350 /   346 ms\ndecorrelated: random(10 ms, pichhla × 3)                      46 /   100 ms           326 /   297 ms\n\nNetwork delay 0 ho toh bina jitter: 100 clients = 5,050 calls (N(N+1)/2 — sab har baar bilkul ek saath; model ki banawat).\n\n→ Bina jitter sabse bura (video sahi; Brooker ne bhi no-jitter ko \"clear loser\" kaha): clients ek jaisa rukte, saath lautte.\n  Network ki thodi variance kuch takkar todti hai, par jitter wali strategies phir bhi kai guna kam calls aur samay lete hain.\n→ Jitter wali strategies aapas mein kareeb hain; unka kram is model mein slot ki chaudai par tika hai (Brooker ke asli\n  simulation mein decorrelated ne full se zyada kaam kiya). \"random(0, backoff)\" — full jitter — ek achha default hai."
        },
        {
          "text": "Lab ke 5 tests.",
          "cmd": "npm test",
          "expect": "npm notice run lab-62-second-attempt@1.0.0 test\nnpm notice run node --test test/*.test.js\n✔ metastable: short backoff and immediate retries stay stuck; long backoff and a token bucket recover; accounting holds (8.288598ms)\n✔ jitter: with zero network variance no-jitter needs N(N+1)/2 calls; jittered strategies need far fewer calls and less time (8.069964ms)\n✔ deadline: retries without cancellation keep slow work running after the user left; propagation alone is not enough (0.497782ms)\n✔ idempotency: key + in-flight lock + parameter check; snapshots; ownership tokens; expiry; delete; add vs set (1.314823ms)\n✔ DLQ retention (standard: from first send; FIFO: reset); availability = MTBF / (MTBF + MTTR) (0.784559ms)\nℹ tests 5\nℹ suites 0\nℹ pass 5\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0\nℹ duration_ms 58.6445"
        }
      ],
      "observe": {
        "q": "Network farq 0 ho toh bina jitter 100 clients = 5,050 calls; 0–4 ms farq ke saath 737. Phir bhi full jitter (350) se zyada kyun?",
        "choices": [
          "Thoda network farq kuch bikhraata hai, par sab ek jaise backoff par lautte",
          "Network farq se clients ka backoff exponential se linear ho jaata hai",
          "0–4 ms farq se cap 1 s se ghat kar 4 ms ho jaata hai, isliye kam calls"
        ],
        "answer": 0,
        "hint": "Bina jitter, 20 ms ke backoff par 0–4 ms ka farq kitna bikhraav deta hai? Full jitter kitna?",
        "explain": "Bina jitter sab clients ~20 ms (± 4 ms) par lautte hain — kuch slots mein bikhar jaate hain, par phir bhi bheed. Full jitter 0 se poore backoff tak bikhraata hai, toh takkar aur kam. Network farq na ho toh model ki banawat se har round mein sab ek saath: N(N+1)/2 = 5,050.",
        "choiceExplanations": [
          "Bina jitter sab clients ~20 ms (± 4 ms) par lautte hain — kuch slots mein bikhar jaate hain, par phir bhi bheed. Full jitter 0 se poore backoff tak bikhraata hai, toh takkar aur kam. Network farq na ho toh model ki banawat se har round mein sab ek saath: N(N+1)/2 = 5,050.",
          "Backoff ka formula same rehta hai; network farq sirf thoda bikhraata hai.",
          "Cap 1 s hi rehta hai; network farq alag cheez hai."
        ]
      },
      "lesson": "Bina jitter calls N² ki tarah badhti hain. Jitter wala backoff default banao."
    }
  ],
  "interview": {
    "title": "Interview Round — backoff design",
    "instructions": "Pehle socho: kitne clients ek saath fail hue, aur clients ka intezaar kitna alag hai? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Har midnight 5,000 devices sync karte hain; server 1 minute ke liye 503 deta hai. Devices fixed 2, 4, 8 s backoff use karte hain. Har retry wave par server phir girta hai. Fix?",
        "choices": [
          "Full jitter backoff + sync ka samay bhi random (midnight ± kuch minute)",
          "Backoff 2, 4, 8 se 4, 8, 16 kar do, taaki server ko zyada samay mile",
          "Retries hata do, device agli raat dobara sync kar lega bina dikkat",
          "Server ko 5,000 devices jitna bada karo, sirf midnight ke liye"
        ],
        "answer": 0,
        "explain": "Problem synchronization hai: sab ek samay shuru, sab ek jaisa backoff. Full jitter retries ko phailata hai; schedule mein bhi randomness (sab midnight par nahi). Video bhi kehta hai AWS ne midnight jobs ki bheed dekhi.",
        "choiceExplanations": [
          "Problem synchronization hai: sab ek samay shuru, sab ek jaisa backoff. Full jitter retries ko phailata hai; schedule mein bhi randomness (sab midnight par nahi). Video bhi kehta hai AWS ne midnight jobs ki bheed dekhi.",
          "Bada backoff bhi ek jaisa = phir ek saath lautna.",
          "Ek raat ka data ruk jaata hai; jitter se aaj hi ho sakta hai.",
          "Ek minute ki bheed ke liye poora din bada server mehnga."
        ]
      },
      {
        "q": "Ek SDK har error par 5 retries karta hai: 2, 4, 8, 16, 32 s, bina cap ke. User 10 s wait karta hai. Kya badloge?",
        "choices": [
          "Cap, deadline mein fit retries, aur sirf asthaayi errors par",
          "Retries 5 se 10 kar do, taaki aakhir mein kaam ho hi jaaye",
          "Jitter hata do, taaki retries ka samay predictable rahe",
          "Kuch nahi — exponential backoff hai toh sab theek hai"
        ],
        "answer": 0,
        "explain": "Teesra retry hi 14 s par hai (2 + 4 + 8) — user ja chuka (bekaar kaam). Cap, deadline-aware koshishein, aur 4xx par retry nahi. Lab 62 ex2: 10 s deadline mein video ke 2/4/8 s backoff ke saath sirf 2 koshishein fit.",
        "choiceExplanations": [
          "Teesra retry hi 14 s par hai (2 + 4 + 8) — user ja chuka (bekaar kaam). Cap, deadline-aware koshishein, aur 4xx par retry nahi. Lab 62 ex2: 10 s deadline mein video ke 2/4/8 s backoff ke saath sirf 2 koshishein fit.",
          "Zyada retries user ke jaane ke baad bhi chalte hain — bekaar.",
          "Jitter takkar todta hai; hatana bheed wapas laata hai.",
          "Exponential akele: cap, deadline aur error type nahi dekhta."
        ]
      }
    ]
  },
  "success": [
    "Bina jitter backoff ka nuksaan gin sakte ho",
    "Jitter strategies mein chun sakte ho",
    "Cap, retry ke errors aur Retry-After bata sakte ho"
  ],
  "cards": [
    {
      "front": "Bina jitter kyun bura?",
      "back": "Sab lagbhag ek saath lautte, ek slot mein ek jeetta. Lab 62 ex1: 100 clients → 737 calls, 8.1 s (network farq 0 ho toh 5,050 = N(N+1)/2)."
    },
    {
      "front": "Kaunsa jitter?",
      "back": "Full: random(0, backoff) — lab: 350 calls, 0.35 s. Decorrelated: 326, 0.30 s. Lab ka chhota jitter (±20%, video ke \"thoda random\" ka ek roop): 391, 0.75 s. Bina jitter: 737, 8.1 s. Saral model; jitter strategies ka aapsi kram workload par tika."
    },
    {
      "front": "Retry kis par?",
      "back": "Timeout, 503, 429 (Retry-After maano). 400/401/404 par nahi. Cap lagao (AWS SDK standard mode: 20 s) aur deadline mein fit karo."
    }
  ]
}
]);
})();
