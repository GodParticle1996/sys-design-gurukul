/* First Principles — FAANG Senior Engineer.
   Source credit: Observability — How to Not Fly Blind (jwVEgkBDyM8), numbered video 14/15.
   Evidence: docker-labs/64-observability/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "arr", "icon": "🚶", "label": "Aane wale", "x": 140, "y": 200}, {"id": "line", "icon": "🧍", "label": "Line", "x": 470, "y": 200}, {"id": "cash", "icon": "🧾", "label": "Cashier", "x": 790, "y": 200}];
const EDGES = [{"from": "arr", "to": "line"}, {"from": "line", "to": "cash"}];
VISUALS["fp-obs-code"] = { t: "Aao, sabse jaldi khaali cashier ki line mein lago, checkout karo — aur gino kaun kitna ruka.", html: SD.viz.svg(HERO, EDGES, { nodes: { arr: {tone:'busy',badge:'random'}, line: {tone:'bad',badge:'ρ/(1−ρ)'}, cash: {tone:'ok',badge:'1 min'} } }, {w:900,h:400}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-obs-code",
  "icon": "🧾",
  "group": "🔭 Observability: Andhe Mat Udo",
  "title": "Observability 3 · Code — line kab phatti hai",
  "badge": "Line Ka Ganitagya",
  "objectives": [
    "Queue simulation ke teen niyam padh sakte ho",
    "50% / 92% / 99% / 100% par wait ka asli bartaav",
    "Utilization law (U = X·S) aur ρ/(1−ρ) ka farq"
  ],
  "lesson": [
    "<h3>🏧 ATM ki line</h3><p>Mohalle ka ek ATM. Log kabhi akele aate hain, kabhi teen saath. ATM aadha samay khaali padha rehta hai — phir bhi kabhi-kabhi line lag jaati hai.</p><p>Salary wale din log thode zyada aate hain, aur line achanak gali tak pahunch jaati hai. ATM utna hi tez hai; sirf aane wale badhe. Aaj ek chhote simulation se dekhte hain ki line kab aur kitni tezi se phatti hai.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "🧾 queue.js: ek-ek customer ki ginti",
      "goal": "lib/queue.js sim() (seeded simulation): video ka grocery store — customer aata hai, sabse pehle khaali hone wale cashier ki line mein lagta hai, checkout hota hai. Har customer ka wait gina jaata hai.",
      "code": {
        "title": "lib/queue.js",
        "file": "docker-labs/64-observability/lib/queue.js",
        "from": 7,
        "text": "function sim({ gapS, serviceS, servers = 1, arrivals = 'random', service = 'random', customers = 1000000, seed = 1, warmup = 0.05 }) {\n  const r = rng(seed), exp = m => -m * Math.log(1 - r());\n  const free = new Float64Array(servers), skip = Math.floor(customers * warmup);\n  const waits = new Float64Array(customers - skip);\n  let t = 0, busy = 0, waited = 0;\n  for (let i = 0; i < customers; i++) {\n    t += arrivals === 'random' ? exp(gapS) : gapS;\n    let k = 0; for (let j = 1; j < servers; j++) if (free[j] < free[k]) k = j;\n    const start = Math.max(t, free[k]), sv = service === 'random' ? exp(serviceS) : serviceS;\n    free[k] = start + sv; busy += sv;\n    if (i >= skip) { const w = start - t; waits[i - skip] = w; if (w > 1e-9) waited++; }\n  }\n  let end = 0; for (const x of free) end = Math.max(end, x);\n  const sum = waits.reduce((a, b) => a + b, 0); waits.sort();\n  return { meanWait: sum / waits.length, pWaited: waited / waits.length, p99Wait: pct(waits, 99),\n    utilization: busy / (servers * end), perHour: customers / end * 3600 };\n}"
      },
      "vars": [
        {
          "id": "part",
          "label": "Hissa"
        },
        {
          "id": "what",
          "label": "Kya hota"
        }
      ],
      "steps": [
        {
          "title": "1. Agla customer",
          "say": "Line 13: agla customer kab aayega. 'random' = gap exponential (kabhi do log saath, kabhi der tak koi nahi; average gapS). 'fixed' = har baar theek gapS.",
          "line": "13",
          "vars": {
            "part": "aana",
            "what": "t badhta hai"
          }
        },
        {
          "title": "2. Kaunsa cashier",
          "say": "Line 14: jo cashier sabse pehle khaali hoga (free[k] sabse chhota). Ek cashier ho toh hamesha pehla (aur akela) cashier. Line ek hi hai — pehle aao, pehle paao (FIFO).",
          "line": "14",
          "vars": {
            "part": "cashier",
            "what": "sabse jaldi khaali"
          }
        },
        {
          "title": "3. Wait",
          "say": "Line 15: checkout shuru = customer ke aane ka samay ya cashier khaali hone ka samay — jo baad mein ho. Wait = start − t (line 17).",
          "line": "15",
          "vars": {
            "part": "wait",
            "what": "start − t"
          },
          "ask": {
            "q": "Customer 10:00 par aaya, cashier 10:03 par khaali hoga. Line 15–17 ke hisaab se wait?",
            "choices": [
              "3 minute — start = max(10:00, 10:03) = 10:03, wait = start − t",
              "0 — customer aate hi checkout shuru, cashier ruk jaata hai",
              "Checkout ke time jitna — wait hamesha service time hota hai"
            ],
            "answer": 0,
            "hint": "Math.max(t, free[k]) kya chunta hai?",
            "explain": "start = Math.max(t, free[k]) = 10:03. Wait = start − t = 3 minute. Cashier pehle khaali hota (10:00 se pehle) toh wait 0. Isliye wait tabhi hota hai jab customer cashier se pehle pahunche.",
            "choiceExplanations": [
              "start = Math.max(t, free[k]) = 10:03. Wait = start − t = 3 minute. Cashier pehle khaali hota (10:00 se pehle) toh wait 0. Isliye wait tabhi hota hai jab customer cashier se pehle pahunche.",
              "Cashier pichhle customer ka checkout beech mein nahi chhodta.",
              "Wait aur checkout alag hain; lab \"wait\" mein apna checkout nahi jodta."
            ]
          }
        },
        {
          "title": "4. Checkout aur hisaab",
          "say": "Line 15–16: checkout ka time (random ya fixed), cashier start + sv tak busy. Line 17: shuru ke 5% customers chhod kar (khaali dukaan se shuruaat ka asar) har wait likho, aur gino kitne ruke (wait > 0).",
          "line": "16-17",
          "vars": {
            "part": "hisaab",
            "what": "wait, ruke"
          }
        },
        {
          "title": "5. Kitna busy, kitna kaam",
          "say": "Line 21–22: utilization = kul checkout time ÷ (cashiers × kul samay). perHour = ghante mein kitne customer nikle. Dono naape hue, maane hue nahi.",
          "line": "21-22",
          "vars": {
            "part": "nateeja",
            "what": "busy %, ghante mein"
          }
        }
      ],
      "lesson": "Simulation sirf teen niyam chalata hai: aao, sabse jaldi khaali cashier ki line mein lago, checkout karo. Wait kisi formula se nahi aata — ginti se aata hai. Phir formula se milaate hain."
    },
    {
      "type": "dryrun",
      "title": "📈 50% se 105% tak — line kab phatti?",
      "goal": "Checkout average 1 min, 10 lakh customers (99% par 40 lakh, chhe seeds). Simulation ko line 25–32 ke textbook formulas se milao.",
      "code": {
        "title": "lib/queue.js",
        "file": "docker-labs/64-observability/lib/queue.js",
        "from": 25,
        "text": "// Textbook formulas (steady state, utilization rho < 1). S = average service time.\nconst mm1Wait = (rho, S) => rho / (1 - rho) * S;          // random arrivals, random service (M/M/1)\nconst md1Wait = (rho, S) => rho / (2 * (1 - rho)) * S;    // random arrivals, fixed service (M/D/1): half of M/M/1\nfunction erlangC(c, a) {                                   // chance an arrival has to wait, c servers, offered load a = c·rho\n  let term = 1, sum = 1; for (let k = 1; k < c; k++) { term *= a / k; sum += term; }\n  const last = term * a / c / (1 - a / c); return last / (sum + last);\n}\nconst mmcWait = (c, rho, S) => erlangC(c, c * rho) * S / (c * (1 - rho));"
      },
      "vars": [
        {
          "id": "busy",
          "label": "Busy"
        },
        {
          "id": "wait",
          "label": "Wait (sim)"
        },
        {
          "id": "ruke",
          "label": "Kitne ruke"
        }
      ],
      "steps": [
        {
          "title": "1. 50% busy",
          "say": "Gap 120 s, checkout 60 s, dono random. Line 26 formula ρ/(1−ρ)·S = 1.00 min. Simulation: 1.00 min, aur 50.0% customers ruke.",
          "line": "26",
          "vars": {
            "busy": "50%",
            "wait": "1.00 min",
            "ruke": "50.0%"
          },
          "ask": {
            "q": "Video: \"50% busy par koi wait nahi karta\". Lab kya kehta hai?",
            "choices": [
              "Galat — aadhe log rukte hain, average wait ek checkout jitna",
              "Sahi — cashier aadha khaali hai, toh kisi ko rukna nahi padta",
              "Sahi — wait sirf 90% busy ke upar shuru hota hai, neeche nahi"
            ],
            "answer": 0,
            "hint": "Log random aate hain — kabhi do log ek saath?",
            "explain": "Random aane par kabhi do-teen log saath aa jaate hain, aur ek ko rukna padta hai. Lab: 50.0% ruke, average wait 1.00 min = ek checkout. Video ka apna formula ρ/(1−ρ)·S bhi 50% par 1 min deta hai. \"Koi nahi rukta\" sirf tab jab aana aur checkout dono fixed hon (agla step).",
            "choiceExplanations": [
              "Random aane par kabhi do-teen log saath aa jaate hain, aur ek ko rukna padta hai. Lab: 50.0% ruke, average wait 1.00 min = ek checkout. Video ka apna formula ρ/(1−ρ)·S bhi 50% par 1 min deta hai. \"Koi nahi rukta\" sirf tab jab aana aur checkout dono fixed hon (agla step).",
              "Cashier aadha samay khaali hai, par khaali samay aur bheed alag palon mein aate hain.",
              "50% par bhi aadhe customers ruke (lab)."
            ]
          }
        },
        {
          "title": "2. Randomness hata do",
          "say": "Fixed gap + fixed checkout (D/D/1): 50% aur 92.3% dono par 0% ruke. Random gap + fixed checkout (M/D/1, line 27): wait M/M/1 ka aadha — 92.3% par 6.0 min.",
          "line": "27",
          "vars": {
            "busy": "92.3%",
            "wait": "0 (D/D/1) · 6.0 min (M/D/1)",
            "ruke": "0% · 92.3%"
          }
        },
        {
          "title": "3. 92.3% busy",
          "say": "Gap 65 s (video: \"har 65 s ek customer\" → ~92% busy, sahi). Formula 12.0 min, simulation 12.2 min, p99 wait 63.9 min. Ghante mein nikle 55.4 — aane walon ke barabar.",
          "line": "26",
          "vars": {
            "busy": "92.3%",
            "wait": "12.2 min",
            "ruke": "92.2%"
          }
        },
        {
          "title": "4. 99% aur 100%+",
          "say": "99%: formula 99 min; chhe seeds 90–118 min — bada, dheere tikta, par seemit. 100%: 10,000 customers ke baad 40 min, 10 lakh ke baad 486 min — badhta hi jaata. 105%: aur tez.",
          "vars": {
            "busy": "99% · 100% · 105%",
            "wait": "~99 min · badhta · badhta",
            "ruke": "—"
          },
          "ask": {
            "q": "Video: \"99% par queue bina had badhti hai, wait infinity\". Lab ke hisaab se sahi baat?",
            "choices": [
              "99% par wait ~99 min (seemit, dheere tikta); bina had sirf 100% ya upar",
              "Sahi — 99% par simulation bhi lambi chalne par badhta hi gaya",
              "Galat — 100% par bhi wait ek jagah tik jaata hai, bas bada hota hai"
            ],
            "answer": 0,
            "hint": "99% par chhe seeds kya dete hain, aur 100% par run lamba karne se kya hota hai?",
            "explain": "99%: chhe seeds 90–118 min, formula 99 min ke dono taraf — bahut bada aur bahut uchhalta hua, par ek seema ke paas. 100% par cashier kabhi aage nahi nikalta; wait run ke saath badhta hi jaata hai (40 → 107 → 486 min). Infinity sirf 100% ya 100% se upar.",
            "choiceExplanations": [
              "99%: chhe seeds 90–118 min, formula 99 min ke dono taraf — bahut bada aur bahut uchhalta hua, par ek seema ke paas. 100% par cashier kabhi aage nahi nikalta; wait run ke saath badhta hi jaata hai (40 → 107 → 486 min). Infinity sirf 100% ya 100% se upar.",
              "99% ke seeds 90–118 min par ruke, badhte nahi gaye.",
              "100% par 10,000 → 10 lakh customers mein wait 40 → 486 min badha."
            ]
          }
        },
        {
          "title": "5. Kaam seedha, wait nahi",
          "say": "Ghante mein nikle: 30 → 48 → 55.4 (50% → 80% → 92.3%) — aane walon ke barabar, busy ke saath seedha. Utilization law: U = X·S (busy = ghante ka kaam × ek checkout). Video ρ/(1−ρ) ko \"utilization law\" kehta hai; ρ/(1−ρ) M/M/1 ka wait formula hai.",
          "vars": {
            "busy": "50 → 92.3%",
            "wait": "1 → 12.2 min",
            "ruke": "throughput seedha"
          }
        },
        {
          "title": "6. Ek cashier vs aath",
          "say": "85% busy: 1 cashier wait 5.67 min; 8 cashier (line 28–32, Erlang C) 0.48 min. \"70% par alert\" ek cashier jaisa thumb rule hai — bade pool (DB connections, threads) ko utna jaldi dard nahi.",
          "line": "28-32",
          "vars": {
            "busy": "85%",
            "wait": "5.67 vs 0.48 min",
            "ruke": "84.9% vs 57.0%"
          }
        }
      ],
      "lesson": "Wait ki jad randomness hai. Busy badhne par kaam seedha badhta hai, wait ρ/(1−ρ) jaisa — 50% par 1×, 92% par 12×, 99% par ~99×; 100% par bina had. Kitne servers hain, us par bhi nirbhar."
    },
    {
      "type": "docker",
      "title": "🧪 Line ka ganit chalao",
      "project": "64-observability",
      "exercise": "ex3-queue",
      "goal": "1 cashier 50–105% busy, fixed vs random, 8 cashier — simulation aur formula saath.",
      "why": "Node 24+ chahiye. Seeded simulation — har baar same output (~3 s).",
      "steps": [
        {
          "text": "Line kab phatti hai.",
          "cmd": "cd docker-labs/64-observability && npm start -- ex3-queue",
          "expect": "ex3 — line kab phatti hai (seeded simulation, har customer gina; checkout average 1 min; \"wait\" = line mein, apna checkout chhod kar)\n\n1) Ek cashier, log random aate hain, checkout ka time bhi random (M/M/1), 10 lakh customers:\n   gap     busy (ρ)   formula ρ/(1−ρ)·S   simulated wait   kitne ruke   p99 wait   ghante mein nikle\n   120 s    50.0%      1.00 min            1.00 min       50.0%    7.92 min   30.0\n    75 s    80.0%      4.00 min            4.03 min       79.9%    22.3 min   48.0\n    65 s    92.3%      12.0 min            12.2 min       92.2%    63.9 min   55.4\n   → 50% par \"koi wait nahi karta\" galat: aadhe customers rukte hain, aur average wait = ek checkout (video ka apna formula).\n   → \"Ghante mein nikle\" aane walon ke barabar: busy hisse ke saath kaam seedha badhta hai (utilization law, U = X·S).\n     Seedha nahi badhta toh WAIT. \"50% par 1000 rps toh 100% par 2000\" throughput ke liye lagbhag theek; latency ke liye nahi.\n\n2) Wait ki jad randomness hai:\n   fixed gap, fixed checkout (D/D/1)    50.0%: wait 0.00 min, ruke 0.0% · 92.3%: wait 0.00 min, ruke 0.0%\n   random gap, fixed checkout (M/D/1)   50.0%: wait 0.50 min, ruke 50.0% · 92.3%: wait 6.01 min, ruke 92.3%\n   M/D/1 formula 92.3% par 6.00 min — M/M/1 ka aadha. Jitna kam utaar-chadhaav, utni chhoti line.\n\n3) 99% busy: formula 99 min. Chhe seeds, 40 lakh customers har ek:\n   simulated wait: 90.4 min · 94.7 min · 106.2 min · 90.1 min · 99.6 min · 118.2 min\n   → bahut bada aur dheere tikta hai, par anant nahi. Anant (bina had) sirf 100% ya 100% se upar:\n   100.0%: 10,000 ke baad 40.4 min · 1,00,000 ke baad 107.1 min · 10,00,000 ke baad 486.1 min\n   105.0%: 10,000 ke baad 253.6 min · 1,00,000 ke baad 1997.7 min · 10,00,000 ke baad 22742.2 min\n   → 100% aur 105% par wait run ke saath badhta hi jaata hai — koi \"average\" nahi tikta.\n\n4) \"70% par alert\" — kitne cashier hain, us par nirbhar (85% busy dono mein, 10 lakh customers):\n   1 cashier: formula 5.67 min · simulated 5.69 min · ruke 84.9%\n   8 cashier: formula 0.48 min · simulated 0.48 min · ruke 57.0%\n   → bade pool (DB connections, threads, servers) ko ek line jitna jaldi dard nahi hota. 70% ek single-cashier\n     wala thumb rule hai; asli seema SLO, utaar-chadhaav aur pool ke size se nikalti hai — load test se naapo."
        },
        {
          "text": "Lab ke 6 tests (simulation formulas se milti hai, alert numbers tay).",
          "cmd": "npm test",
          "expect": "✔ ex0: average, two p99 definitions, merged histograms (22.348249ms)\n✔ ex1: real HTTP mesh — tree from parent ids, skewed log order, broken propagation (1108.888262ms)\n✔ ex1: traceparent parsing and continuing a caller trace (10.80949ms)\n✔ ex2: costs and sampling (5.183804ms)\n✔ ex3: queue simulator matches the formulas (251.397423ms)\n✔ ex4: budget and alert rules (26.419589ms)\nℹ tests 6\nℹ suites 0\nℹ pass 6\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0\nℹ duration_ms 1482.801257"
        }
      ],
      "observe": {
        "q": "80% busy par average wait 4.03 min, 92.3% par 12.2 min. Busy 12.3 percentage points (~15%) badha, wait 3× kyun?",
        "choices": [
          "Wait ρ/(1−ρ) jaisa badhta hai; khaali hissa 1−ρ 0.2 se 0.077 hua",
          "92% par simulation zyada customers ginta hai, isliye wait zyada",
          "Cashier 92% par thak jaata hai aur checkout dheema karta hai"
        ],
        "answer": 0,
        "hint": "ρ/(1−ρ) mein neeche wala hissa kitna chhota hua?",
        "explain": "0.8/0.2 = 4; 0.923/0.077 ≈ 12. Neeche wala (1−ρ) khaali samay hai — khaali samay 20% se 7.7% hua, toh bheed nikalne ka mauka bahut kam. Checkout ka average time same (1 min) raha; simulation mein koi thakaan nahi.",
        "choiceExplanations": [
          "0.8/0.2 = 4; 0.923/0.077 ≈ 12. Neeche wala (1−ρ) khaali samay hai — khaali samay 20% se 7.7% hua, toh bheed nikalne ka mauka bahut kam. Checkout ka average time same (1 min) raha; simulation mein koi thakaan nahi.",
          "Dono runs mein 10 lakh customers.",
          "Checkout ka average 1 min hi raha (line 15)."
        ]
      },
      "lesson": "Simulation aur formula dono milte hain. Load test ko expected peak se upar le jao — wait ka curve 80% ke baad tez mudta hai."
    }
  ],
  "interview": {
    "title": "Interview Round — saturation aur line",
    "instructions": "Pehle socho: kitna busy, kitna randomness, kitne servers? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Load test 80% CPU tak gaya, p99 theek. Launch par traffic ~15% zyada aaya, CPU ~92%, aur p99 3× ho gaya. Team hairaan: \"traffic sirf 15% badha!\" Sabse achha pehla kadam?",
        "choices": [
          "Queue ka shak: line ka wait, service time, retries aur traces naapo",
          "Load test galat tha — CPU 92% par code apne aap dheema ho jaata hai",
          "15% traffic par latency 15% hi badhni chahiye thi, pakka koi bug hai",
          "CPU 92% par OS crash ke kareeb hota hai, turant servers dugne karo"
        ],
        "answer": 0,
        "explain": "Lab ke M/M/1 model mein busy 80% → 92.3% hone par AVERAGE line wait ~3× hota hai (4 → 12 min, ρ/(1−ρ)) — toh queueing ek mazboot shak hai. Par CPU % ek aggregate number hai, aur p99 badhne ki aur wajahen bhi ho sakti hain: service time badhna (naya code, dheema DB), retries se traffic badhna (FP12). Isliye naapo: queue/pool ka wait, har request ka service time, retries, aur traces. Load test expected peak se upar le jao.",
        "choiceExplanations": [
          "Lab ke M/M/1 model mein busy 80% → 92.3% hone par AVERAGE line wait ~3× hota hai (4 → 12 min, ρ/(1−ρ)) — toh queueing ek mazboot shak hai. Par CPU % ek aggregate number hai, aur p99 badhne ki aur wajahen bhi ho sakti hain: service time badhna (naya code, dheema DB), retries se traffic badhna (FP12). Isliye naapo: queue/pool ka wait, har request ka service time, retries, aur traces. Load test expected peak se upar le jao.",
          "Code dheema hua ya line lambi hui — naap ke bina pata nahi.",
          "Latency busy ke saath seedhi nahi badhti (lab ex3), bina bug ke bhi.",
          "92% busy crash nahi hai; pehle naapo, phir capacity."
        ]
      },
      {
        "q": "Video: \"70% par alert karo, 100% par nahi\". Tumhare paas 64 connections ka DB pool hai. Sahi soch?",
        "choices": [
          "70% thumb rule hai; pool ke wait time aur SLO se seema naapo",
          "70% hamesha sahi — ganit sab systems par ek jaisa lagta hai",
          "Pool bada hai toh alert ki zaroorat hi nahi, 100% tak chalao",
          "Alert 50% par lagao — 50% se upar har system dheema hota hai"
        ],
        "answer": 0,
        "explain": "Kai servers wali line (Erlang C) ek cashier se kahin der tak sambhalti hai: lab mein 85% par 8 cashier 0.48 min vs 1 cashier 5.67 min. 64 connections ka pool aur bhi upar tak chal sakta hai. Saturation par alert zaroori hai — par seema pool ke wait time (pool.wait_ms), SLO aur load test se tay karo.",
        "choiceExplanations": [
          "Kai servers wali line (Erlang C) ek cashier se kahin der tak sambhalti hai: lab mein 85% par 8 cashier 0.48 min vs 1 cashier 5.67 min. 64 connections ka pool aur bhi upar tak chal sakta hai. Saturation par alert zaroori hai — par seema pool ke wait time (pool.wait_ms), SLO aur load test se tay karo.",
          "Ek cashier aur kai cashier ka ganit alag hai (lab: 5.67 vs 0.48 min).",
          "Bade pool bhi 100% par bina had line banate hain.",
          "50% par bhi aadhe log rukte hain — par wait chhota; seema SLO se aati hai."
        ]
      }
    ]
  },
  "success": [
    "sim() ke teen niyam (aao, cashier chuno, checkout) samjha sakte ho",
    "50% / 92% / 99% / 100% par wait bata sakte ho",
    "Utilization law aur wait formula ka farq bata sakte ho"
  ],
  "cards": [
    {
      "front": "M/M/1 wait (line mein)?",
      "back": "ρ/(1−ρ) × service time. 50% → 1×, 80% → 4×, 92.3% → 12×, 99% → 99×. 100% ya upar: bina had."
    },
    {
      "front": "50% busy par kitne rukte hain (random aana)?",
      "back": "Lab: 50.0%, average wait = ek checkout. \"Koi nahi rukta\" sirf jab aana aur checkout dono fixed (D/D/1)."
    },
    {
      "front": "Utilization law?",
      "back": "U = X·S: busy hissa = throughput × service time. Kaam busy ke saath seedha badhta hai; wait nahi."
    }
  ]
}
]);
})();
