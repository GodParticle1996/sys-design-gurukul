/* First Principles — FAANG Senior Engineer.
   Source credit: Master the Math of Scale (04ip8kPZXsM), numbered video 2/15.
   Evidence: docker-labs/52-scale-math/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "arr", "icon": "🚗", "label": "aati requests", "x": 140, "y": 105}, {"id": "line", "icon": "🧍", "label": "line", "x": 445, "y": 105}, {"id": "wk", "icon": "👷", "label": "worker", "x": 750, "y": 105}];
const EDGES = [{"from": "arr", "to": "line"}, {"from": "line", "to": "wk"}];
VISUALS["fp-scale-kaise"] = { t: "Booth 90% busy: ek chhota jhund aaya aur line minutes ki. Load aur intezaar ka rishta seedha kyun nahi?", html: SD.viz.svg(HERO, EDGES, { nodes: { arr: {tone:'acc',badge:'random aana'}, line: {tone:'slow',badge:'90%: 10× kaam'}, wk: {tone:'busy',badge:'90% busy'} } }, {w:890,h:215}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-scale-kaise",
  "icon": "📈",
  "group": "📈 Math of Scale",
  "title": "Scale 2 · Kaise — 90% busy par line itni lambi kyun?",
  "badge": "Knee Pehchaanne Wala",
  "objectives": [
    "Ausat load theek ho tab bhi line kyun banti hai?",
    "Load badhne par intezaar kis aakaar mein badhta hai?",
    "Saturation ko pehle se kaise pakdein?"
  ],
  "lesson": [
    "<h3>🛣️ Toll plaza ka ek booth</h3><p>Highway par ek booth, har gaadi 10 second. Gaadiyan kam hon toh koi nahi rukta. Booth 90% busy ho toh ek truck ka 10 second ruk jaana bhi poori line ko minutes tak rok deta hai.</p><p>KhanaKart ka checkout worker bhi booth jaisa hai. Pehle chhe requests ka hisaab haath se karo.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "🧍 80% busy, phir bhi intezaar kyun?",
      "goal": "Ek worker, har request theek 10 ms. 6 requests 0, 3, 6, 9, 40, 65 ms par aati hain: 60 ms ka saara kaam 0–75 ms ke andar — 0–75 ms ki window mein worker 80% busy. Lab 52 ka ex0-slowmo queue.",
      "nodes": [
        {
          "id": "arr",
          "icon": "🚗",
          "label": "aati requests",
          "x": 140,
          "y": 105
        },
        {
          "id": "line",
          "icon": "🧍",
          "label": "line",
          "x": 445,
          "y": 105
        },
        {
          "id": "wk",
          "icon": "👷",
          "label": "worker",
          "x": 750,
          "y": 105
        }
      ],
      "edges": [
        {
          "from": "arr",
          "to": "line"
        },
        {
          "from": "line",
          "to": "wk"
        }
      ],
      "viz": {
        "w": 890,
        "h": 215
      },
      "vars": [
        {
          "id": "clock",
          "label": "Ghadi (ms)"
        },
        {
          "id": "free",
          "label": "Worker free kab"
        },
        {
          "id": "wait",
          "label": "Intezaar"
        }
      ],
      "steps": [
        {
          "title": "#1 aaya",
          "clock": "0 ms",
          "say": "0 ms par #1 aaya. Worker khaali hai: turant shuru, 10 par khatam.",
          "nodes": {
            "arr": {
              "tone": "acc",
              "badge": "#1"
            },
            "line": {
              "tone": "idle",
              "badge": "khaali"
            },
            "wk": {
              "tone": "busy",
              "badge": "#1 → 10"
            }
          },
          "vars": {
            "clock": "0",
            "free": "10",
            "wait": "#1: 0"
          },
          "flows": [
            {
              "from": "arr",
              "to": "line",
              "label": "#1",
              "tone": "acc"
            },
            {
              "from": "line",
              "to": "wk",
              "label": "#1",
              "tone": "acc"
            }
          ]
        },
        {
          "title": "#2 aur #3 jaldi aaye",
          "clock": "3–6 ms",
          "say": "#2 3 ms par, #3 6 ms par. Worker 10 tak busy: #2 10 par shuru (7 ms ruka), #3 20 par (14 ms ruka).",
          "nodes": {
            "arr": {
              "tone": "acc",
              "badge": "#2, #3"
            },
            "line": {
              "tone": "slow",
              "badge": "2 khade"
            },
            "wk": {
              "tone": "busy",
              "badge": "#1"
            }
          },
          "vars": {
            "clock": "6",
            "free": "30",
            "wait": "#2: 7 · #3: 14"
          },
          "flows": [
            {
              "from": "arr",
              "to": "line",
              "label": "#2 #3",
              "tone": "acc"
            }
          ]
        },
        {
          "title": "#4 9 ms par",
          "clock": "9 ms",
          "say": "#4 9 ms par aaya. Line mein #2 aur #3 aage hain.",
          "nodes": {
            "arr": {
              "tone": "acc",
              "badge": "#4"
            },
            "line": {
              "tone": "slow",
              "badge": "3 khade"
            },
            "wk": {
              "tone": "busy",
              "badge": "#1"
            }
          },
          "vars": {
            "clock": "9",
            "free": "30",
            "wait": "#4: ?"
          },
          "flows": [
            {
              "from": "arr",
              "to": "line",
              "label": "#4",
              "tone": "acc"
            }
          ],
          "ask": {
            "q": "#4 9 ms par aaya. Kab shuru hoga, aur kitna rukega?",
            "choices": [
              "30 ms par shuru, 21 ms ruka — #1, #2, #3 ka kaam pehle khatam hoga",
              "10 ms par shuru, 1 ms ruka — #1 khatam hote hi agla aane wala jaata hai",
              "9 ms par turant shuru — worker 80% busy hai, toh 20% jagah khaali hai"
            ],
            "answer": 0,
            "hint": "Worker ke aage line mein kitna kaam bacha hai?",
            "explain": "Worker 10 tak #1, phir 20 tak #2, 30 tak #3. #4 ki baari 30 par: 30 − 9 = 21 ms intezaar. Line FIFO hai — pehle aaya, pehle gaya.",
            "choiceExplanations": [
              "Worker 10 tak #1, phir 20 tak #2, 30 tak #3. #4 ki baari 30 par: 30 − 9 = 21 ms intezaar. Line FIFO hai — pehle aaya, pehle gaya.",
              "Line mein #2 aur #3 #4 se pehle aaye the; FIFO mein baari aane ke kram se.",
              "80% busy ek lambe samay ka ausat hai. 9 ms par #1 chal rahi hai; #2 aur #3 line mein #4 se aage hain."
            ]
          }
        },
        {
          "title": "#5 40 ms par",
          "clock": "40 ms",
          "say": "#4 40 par khatam. #5 theek 40 par aaya: koi intezaar nahi.",
          "nodes": {
            "arr": {
              "tone": "acc",
              "badge": "#5"
            },
            "line": {
              "tone": "ok",
              "badge": "khaali"
            },
            "wk": {
              "tone": "busy",
              "badge": "#5 → 50"
            }
          },
          "vars": {
            "clock": "40",
            "free": "50",
            "wait": "#4: 21 · #5: 0"
          },
          "flows": [
            {
              "from": "arr",
              "to": "line",
              "label": "#5",
              "tone": "acc"
            },
            {
              "from": "line",
              "to": "wk",
              "label": "#5",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "#6 65 ms par",
          "clock": "65 ms",
          "say": "Worker 50 se 65 tak khaali baitha. #6 65 par aaya, turant shuru, 75 par khatam.",
          "nodes": {
            "arr": {
              "tone": "acc",
              "badge": "#6"
            },
            "line": {
              "tone": "ok",
              "badge": "khaali"
            },
            "wk": {
              "tone": "busy",
              "badge": "#6 → 75"
            }
          },
          "vars": {
            "clock": "65",
            "free": "75",
            "wait": "kul 42 ms"
          },
          "flows": [
            {
              "from": "line",
              "to": "wk",
              "label": "#6",
              "tone": "ok"
            }
          ],
          "ask": {
            "q": "Kul kaam 60 ms, worker ~80% busy. Phir bhi 42 ms intezaar kyun hua?",
            "choices": [
              "Requests jhund mein aayi; baad ka khaali samay pehle ka intezaar wapas nahi karta",
              "Worker ne beech mein dheema kaam kiya — 80% par har request 10 ms se zyada leti hai",
              "Line ka hisaab galat hai — 80% busy par intezaar shunya hona chahiye tha"
            ],
            "answer": 0,
            "hint": "50 se 65 ms ke beech worker kya kar raha tha?",
            "explain": "Pehli chaar requests 9 ms ke andar aayi; worker chaaron requests ko ek-ek karke hi nipta sakta tha. Baad mein worker 15 ms khaali baitha, par khaali samay pichhle intezaar ko nahi mitata. Har 12.5 ms par barabar aati toh kisi request ka intezaar nahi. Sirf ausat load se intezaar tay nahi hota; requests ka jhund aur kaam ka farq (variance) bhi asar daalte hain.",
            "choiceExplanations": [
              "Pehli chaar requests 9 ms ke andar aayi; worker chaaron requests ko ek-ek karke hi nipta sakta tha. Baad mein worker 15 ms khaali baitha, par khaali samay pichhle intezaar ko nahi mitata. Har 12.5 ms par barabar aati toh kisi request ka intezaar nahi. Sirf ausat load se intezaar tay nahi hota; requests ka jhund aur kaam ka farq (variance) bhi asar daalte hain.",
              "Har request theek 10 ms ki thi. Intezaar line mein khade rehne ka hai, kaam ka nahi.",
              "Barabar faasle par aati toh shunya hota. Asli traffic jhund mein aata hai."
            ]
          }
        }
      ],
      "lesson": "Ausat load 80% hone par bhi requests jhund mein aayein toh line banti hai. Khaali samay baad mein aaye toh pehle ka intezaar wapas nahi hota."
    },
    {
      "type": "cards",
      "title": "🛣️ Toll plaza: load badha, intezaar kitna?",
      "goal": "Ab random aane wali requests aur random kaam (avg 10 ms). Load 30% se 95% tak — intezaar ka aakaar dekho.",
      "lesson": "Lab ke ek-worker model (M/M/1: random aana, random kaam) mein mean response time = kaam ÷ (1 − load). 100% ke paas (1 − load) shunya ke paas, intezaar bina hadd — exponential nahi, par bahut tez. Kaam barabar ho toh intezaar lagbhag aadha. Saturation (kitna bhara) pehle se dekho.",
      "steps": [
        {
          "title": "1. Load ka hisaab",
          "say": "Ek worker, random arrivals, random kaam avg 10 ms. Theory: mean samay = 10 ÷ (1 − load). 50% par 20 ms, 80% par 50 ms, 90% par 100 ms, 95% par 200 ms.",
          "ask": {
            "q": "Load 50% se 90% hua (kaam 1.8 guna). Mean samay kitna hua?",
            "choices": [
              "20 ms se 100 ms — 5 guna, kyunki (1 − load) 0.5 se 0.1 hua",
              "20 ms se 36 ms — load 1.8 guna hua, toh samay bhi 1.8 guna",
              "20 ms se 320 ms — har 10% load par samay dugna, chaar baar dugna"
            ],
            "answer": 0,
            "hint": "10 ÷ (1 − load) mein 0.5 aur 0.9 daal ke dekho.",
            "explain": "10 ÷ 0.5 = 20 ms, 10 ÷ 0.1 = 100 ms. Load 1.8 guna, samay 5 guna. Lab ex3: 20.0 ms → 96.3 ms. Badhna 1 ÷ (1 − load) jaisa hai — har kadam par dugna (exponential) nahi.",
            "choiceExplanations": [
              "10 ÷ 0.5 = 20 ms, 10 ÷ 0.1 = 100 ms. Load 1.8 guna, samay 5 guna. Lab ex3: 20.0 ms → 96.3 ms. Badhna 1 ÷ (1 − load) jaisa hai — har kadam par dugna (exponential) nahi.",
              "Samay load ke saath seedha nahi badhta. Line ka intezaar (1 − load) se bhaag hota hai.",
              "Har 10% par dugna exponential hai. Asli aakaar 1 ÷ (1 − load): 50→90% par 5 guna, 16 guna nahi."
            ]
          }
        },
        {
          "title": "2. Little's law kya kehta hai",
          "say": "FP topic 1 se: <code>L = λ × W</code> — andar ki ausat ginti = aane ki dar × andar ka ausat samay. 90 requests/s aur har request 0.1 s andar toh ausat 9 andar. Video kehta hai ki Little's law se intezaar \"exponentially\" badhta hai.",
          "ask": {
            "q": "Video ka daava: 100% ke paas intezaar Little's law ke hisaab se exponentially badhta hai. Sahi?",
            "choices": [
              "Nahi — Little's law sirf averages jodta hai; badhne ka aakaar queueing theory se aata hai",
              "Haan — L = λ × W mein λ badhe toh W exponentially badhta hai, yahi Little's law hai",
              "Haan — 100% ke paas har line ka samay e^load ki tarah badhta hai, yahi formula hai"
            ],
            "answer": 0,
            "hint": "L = λ × W mein W ka load se koi formula hai?",
            "explain": "Little's law teeno averages ko jodta hai; W kitna hoga, Little's law nahi batata. Queueing theory (jaise M/M/1) batati hai: W = kaam ÷ (1 − load). M/M/1 ka formula exponential nahi; 100% ke paas W bina hadd badhta hai.",
            "choiceExplanations": [
              "Little's law teeno averages ko jodta hai; W kitna hoga, Little's law nahi batata. Queueing theory (jaise M/M/1) batati hai: W = kaam ÷ (1 − load). M/M/1 ka formula exponential nahi; 100% ke paas W bina hadd badhta hai.",
              "L = λ × W ek pehchaan hai: λ aur W diye hon toh L. W ka load se rishta queueing model deta hai.",
              "e^load jaisa koi formula nahi; M/M/1 mein 1 ÷ (1 − load) hai."
            ]
          }
        },
        {
          "title": "3. Kaam barabar ho toh?",
          "say": "Wahi load, par har request theek 10 ms (random nahi). Lab ex3, 90% load: random kaam par mean 96.3 ms, barabar kaam par 56.1 ms. Same 10 ms mean par kaam ka farq (variance) ghatne se queue wait kam hua. Video kehta hai: hamesha 50 ms wali service, kabhi 10 kabhi 500 ms wali se behtar. Ye faisla SLO aur 500 ms ki frequency par tika hai — alag mean wale designs ko sirf predictability se behtar mat maano."
        },
        {
          "title": "4. Saturation: kitna bhara",
          "say": "Google SRE book: \"The four golden signals of monitoring are latency, traffic, errors, and saturation.\" Saturation: \"How \"full\" your service is\" — sabse tang resource: CPU, thread pool, DB connections, queue ki gehraai. \"Note that many systems degrade in performance before they achieve 100% utilization, so having a utilization target is essential.\"",
          "ask": {
            "q": "DB connection pool 40% se 85% bhar gaya. p99 abhi bhi theek hai. Kya karoge?",
            "choices": [
              "Chetavani maano — SLO, queue wait aur traffic growth jaancho; load test se headroom tay karo",
              "Kuch nahi — p99 abhi theek hai, toh pool ko 100% tak bharne do, phir sochenge",
              "Pool chhota kar do — kam connections honge toh pool kam bhara dikhega, saturation kam"
            ],
            "answer": 0,
            "hint": "85% bhara pool kya batata hai, aur kya nahi?",
            "explain": "Saturation latency se pehle chetavani deta hai, par 85% akela exact latency nahi batata. Lab ka 1 ÷ (1 − load) ek-worker M/M/1 model hai; kai connections wale pool ke liye alag queueing model ya load test chahiye. SRE: \"Latency increases are often a leading indicator of saturation\" — p99 ka chhota sa badhna bhi dekho, aur faisla SLO aur naape hue headroom se karo.",
            "choiceExplanations": [
              "Saturation latency se pehle chetavani deta hai, par 85% akela exact latency nahi batata. Lab ka 1 ÷ (1 − load) ek-worker M/M/1 model hai; kai connections wale pool ke liye alag queueing model ya load test chahiye. SRE: \"Latency increases are often a leading indicator of saturation\" — p99 ka chhota sa badhna bhi dekho, aur faisla SLO aur naape hue headroom se karo.",
              "100% ke paas intezaar bahut badhta hai; tab tak users atak chuke honge.",
              "Pool chhota karne se requests pool ke bahar line mein khadi hongi — saturation chhupega, ghatega nahi."
            ]
          }
        },
        {
          "title": "5. 60–70% par rokna",
          "say": "Video: FAANG systems 60–70% par autoscale ya throttle karte hain. 60–70% ek thumb rule hai, kanoon nahi. Hadd SLO, kaam ka variance aur naye server aane ke samay se tay karo: barabar kaam 90% par 56 ms deta hai, random kaam 70% par hi 33 ms."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Load 30% se 95%: knee dekho",
      "project": "52-scale-math",
      "exercise": "ex3-knee",
      "goal": "Ek worker, random arrivals. Har load par 5,00,000 requests, random kaam (M/M/1) aur barabar kaam (M/D/1).",
      "why": "Node 22+ chahiye. Seeded simulation (seed 52): teeno runs byte-identical. Theory column formula se.",
      "steps": [
        {
          "text": "Lab folder se: pehle haath wala udaharan, 6 requests.",
          "cmd": "cd docker-labs/52-scale-math && npm start -- ex0-slowmo queue",
          "expect": "== queue: one worker, 10 ms per request; 6 × 10 = 60 ms of work, all inside 0–75 ms → busy 80% of that window ==\n#1: arrives  0  starts  0  ends 10  waited  0 ms\n#2: arrives  3  starts 10  ends 20  waited  7 ms\n#3: arrives  6  starts 20  ends 30  waited 14 ms\n#4: arrives  9  starts 30  ends 40  waited 21 ms\n#5: arrives 40  starts 40  ends 50  waited  0 ms\n#6: arrives 65  starts 65  ends 75  waited  0 ms\ntotal wait: 42 ms; evenly spread (every 12.5 ms) no request would wait"
        },
        {
          "text": "Ab random aana, 5,00,000 requests har load par.",
          "cmd": "npm start -- ex3-knee",
          "expect": "MODEL: seeded simulation (seed 52), one worker, FIFO line, random (Poisson) arrivals, 5,00,000 requests per row\nrandom work = exponential, avg 10 ms (M/M/1); fixed work = exactly 10 ms (M/D/1)\ntheory mean time: M/M/1 = 10 ÷ (1 − load); M/D/1 = 10 + load × 10 ÷ (2 × (1 − load))\n\nload   work    mean time  theory     p99 time   busy\n 30%   random    14.3 ms    14.3 ms    65.5 ms  30.0%\n 30%   fixed     12.2 ms    12.1 ms    29.0 ms  30.0%\n 50%   random    20.0 ms    20.0 ms    91.2 ms  49.9%\n 50%   fixed     15.0 ms    15.0 ms    43.6 ms  50.1%\n 70%   random    33.1 ms    33.3 ms     150 ms  69.9%\n 70%   fixed     21.8 ms    21.7 ms    76.1 ms  70.1%\n 80%   random    49.4 ms    50.0 ms     222 ms  79.9%\n 80%   fixed     30.2 ms    30.0 ms     115 ms  80.1%\n 90%   random    96.3 ms     100 ms     438 ms  89.9%\n 90%   fixed     56.1 ms    55.0 ms     228 ms  90.1%\n 95%   random     186 ms     200 ms     849 ms  94.9%\n 95%   fixed      108 ms     105 ms     454 ms  95.1%"
        }
      ],
      "observe": {
        "q": "Lab ka M/M/1 model, random kaam avg 10 ms. Load 90% se 95% hua. Theory mein mean response time kitne guna hoga?",
        "choices": [
          "2× — 100% tak bachi jagah (1 − load) 0.10 se 0.05 hui, aadhi",
          "95 ÷ 90 ≈ 1.06× — load 5.6% badha, toh samay bhi utna hi",
          "4× — bachi jagah aadhi hui, aur intezaar jagah ke square se badhta"
        ],
        "answer": 0,
        "hint": "10 ÷ (1 − load) mein 0.90 aur 0.95 daalo.",
        "explain": "Theory: 10 ÷ 0.10 = 100 ms, 10 ÷ 0.05 = 200 ms → 2×. Lab: 96.3 → 186 ms (ek seed ka finite sample theory se thoda neeche). 100% ke paas har chhota load bhi samay ko bahut badhata hai — load badhne par samay ka tezi se badhna hi knee hai.",
        "choiceExplanations": [
          "Theory: 10 ÷ 0.10 = 100 ms, 10 ÷ 0.05 = 200 ms → 2×. Lab: 96.3 → 186 ms (ek seed ka finite sample theory se thoda neeche). 100% ke paas har chhota load bhi samay ko bahut badhata hai — load badhne par samay ka tezi se badhna hi knee hai.",
          "Samay load ke anupaat mein nahi badhta; bachi jagah (1 − load) se bhaag hota hai.",
          "Intezaar 1 ÷ (bachi jagah) se badhta hai, square se nahi: 0.10 → 0.05 par 2×."
        ]
      },
      "lesson": "Lab ke M/M/1 model mein mean response time 1 ÷ (1 − load) ki tarah badhta hai: 90% se upar har point mehenga. Same mean par kaam barabar ho toh har load par line lagbhag aadhi."
    }
  ],
  "interview": {
    "title": "Interview Round — load aur line",
    "instructions": "Pehle socho: worker kitna bhara hai, aur aur bharne par line ka kya hoga? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Service ka CPU 85% par stable hai. p50 theek, par p99 har hafte thoda badh raha hai. Traffic har mahine 3% badhta hai. Kya bataoge?",
        "choices": [
          "Chetavani hai — p99 ki wajah aur headroom naapo; SLO aur scale-up samay se capacity tay karo",
          "CPU 100% tak safe hai — 85% par koi khatra nahi, 95% par alert lagao tab dekhenge",
          "p99 ka badhna GC ka noise hai — p50 theek hai toh users ke liye service theek hai",
          "Traffic 3% badha toh p99 bhi 3% hi badhega — agle saal tak koi kaam nahi chahiye"
        ],
        "answer": 0,
        "explain": "85% CPU aur dheere badhta p99 jaanch ki wajah hain. Lab ka 1 ÷ (1 − load) ek-worker M/M/1 hai; kai cores wali service par exact formula bina model ke nahi lagta. Load test se hadd naapo, aur SLO aur scale-up ke samay se capacity tay karo. SRE: \"many systems degrade in performance before they achieve 100% utilization\".",
        "choiceExplanations": [
          "85% CPU aur dheere badhta p99 jaanch ki wajah hain. Lab ka 1 ÷ (1 − load) ek-worker M/M/1 hai; kai cores wali service par exact formula bina model ke nahi lagta. Load test se hadd naapo, aur SLO aur scale-up ke samay se capacity tay karo. SRE: \"many systems degrade in performance before they achieve 100% utilization\".",
          "Kai systems 100% se pehle dheeme hote hain; 95% par alert tab aa sakta hai jab users atak chuke hon.",
          "p50 theek rehte hue bhi p99 badhna saturation ka pehla nishaan ho sakta hai — wajah naapo.",
          "Load aur latency ka rishta aksar seedha nahi hota; bhare system par thoda load bhi zyada asar karta hai."
        ]
      },
      {
        "q": "Ek service ki errors har minute 50 hi hain, par traffic aadha ho gaya. Kya matlab nikaaloge?",
        "choices": [
          "Error rate dugna hua — aur traffic ka girna khud signal ho sakta hai ki users pahunch nahi pa rahe",
          "Kuch nahi badla — errors ki ginti wahi 50 hai, toh service ki sehat bhi wahi hai",
          "Error rate aadha hua — traffic aadha hua toh har request ke fail hone ka chance bhi aadha",
          "Traffic kam hai toh service ko aaram mila — errors apne aap jaldi ghat jaayengi"
        ],
        "answer": 0,
        "explain": "Errors ko traffic ke hisaab se dekho: 50 errors aadhe traffic par = dugna error rate. Video ki baat: traffic ka achanak girna ye bhi ho sakta hai ki requests service tak pahunch hi nahi rahi. SRE: errors ki latency bhi dekho — \"a slow error is even worse than a fast error!\"",
        "choiceExplanations": [
          "Errors ko traffic ke hisaab se dekho: 50 errors aadhe traffic par = dugna error rate. Video ki baat: traffic ka achanak girna ye bhi ho sakta hai ki requests service tak pahunch hi nahi rahi. SRE: errors ki latency bhi dekho — \"a slow error is even worse than a fast error!\"",
          "Errors 50 hi hain, par requests aadhi — har request ka fail hona dugna hua.",
          "50 ÷ aadha traffic = dugna rate. Aadha nahi.",
          "Errors ka traffic se kam hona zaroori nahi; dikkat abhi bhi chal rahi hai."
        ]
      }
    ]
  },
  "success": [
    "Jhund se line kaise banti hai, haath se dikha sakte ho",
    "1 ÷ (1 − load) se intezaar ka andaaza laga sakte ho",
    "Saturation ko chetavani ki tarah padh sakte ho"
  ],
  "cards": [
    {
      "front": "Load 50% → 90%, mean samay?",
      "back": "Lab ka ek-worker M/M/1 model: mean response time = kaam ÷ (1 − load): 20 ms → 100 ms. Lab: 20.0 → 96.3 ms. Load 1.8 guna, samay 5 guna."
    },
    {
      "front": "Little's law kya kehta hai?",
      "back": "L = λ × W: andar ki ausat ginti = aane ki dar × andar ka ausat samay. Load ke saath intezaar ka badhna queueing theory batati hai."
    },
    {
      "front": "Saturation?",
      "back": "Sabse tang resource kitna bhara: CPU, thread pool, connections, queue. Bahut systems 100% se pehle dheeme — utilization target rakho, p99 ka chhota badhna bhi dekho."
    }
  ]
}
]);
})();
