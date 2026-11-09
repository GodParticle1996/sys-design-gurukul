/* First Principles — FAANG Senior Engineer.
   Source credit: Master the Math of Scale (04ip8kPZXsM), numbered video 2/15.
   Evidence: docker-labs/52-scale-math/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "pc", "icon": "📊", "label": "percentile()", "x": 140, "y": 105}, {"id": "qr", "icon": "🧍", "label": "queueRun()", "x": 445, "y": 105}, {"id": "lk", "icon": "🔒", "label": "lock()", "x": 750, "y": 105}];
const EDGES = [{"from": "pc", "to": "qr"}, {"from": "qr", "to": "lk"}];
VISUALS["fp-scale-code"] = { t: "Teen chhote functions: rank ka niyam, line ki teen lines, aur ek waqt ek worker wala lock.", html: SD.viz.svg(HERO, EDGES, { nodes: { pc: {tone:'acc',badge:'rank = ⌈p% × N⌉'}, qr: {tone:'acc',badge:'start = max(…)'}, lk: {tone:'acc',badge:'ek waqt ek'} } }, {w:890,h:215}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-scale-code",
  "icon": "📈",
  "group": "📈 Math of Scale",
  "title": "Scale 3 · Code — percentile, line aur lock",
  "badge": "Ganit Kaarigar",
  "objectives": [
    "percentile() rank kaise nikaalta hai, aur chhoti list par p99 kya hai?",
    "Line ka intezaar teen lines mein kaise nikalta hai?",
    "Shared lock kaise kaam karta hai, aur ek naapne wala bug kaise pakda gaya?"
  ],
  "lesson": [
    "<h3>💻 Teen chhote functions</h3><p>Lab 52 ke numbers teen chhote functions se aate hain: <b>percentile</b> (rank), <b>queueRun</b> (line) aur <b>lock</b> (ek waqt ek worker).</p><p>Har function mein ek line hai jo poora number badal sakti hai. Code khol ke dekho.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "📊 percentile(): rank ka niyam",
      "goal": "lib/stats.js. List pehle sort hoti hai. p% aur list ki lambai N se rank nikalti hai, phir us rank ka number.",
      "code": {
        "title": "lib/stats.js",
        "file": "docker-labs/52-scale-math/lib/stats.js",
        "from": 20,
        "text": "// Nearest-rank percentile: the value that p% of samples are at or below.\nfunction percentile(sorted, p) {\n  if (!sorted.length) throw new Error('percentile: empty list');\n  if (!(p > 0 && p <= 100)) throw new Error('percentile: p must be in (0, 100]');\n  const rank = Math.ceil((p / 100) * sorted.length);\n  return sorted[rank - 1];\n}"
      },
      "vars": [
        {
          "id": "list",
          "label": "Sorted list"
        },
        {
          "id": "rank",
          "label": "rank = ⌈p% × N⌉"
        },
        {
          "id": "val",
          "label": "Jawab"
        }
      ],
      "steps": [
        {
          "title": "1. Bekaar input",
          "say": "Line 22: khaali list par error. Line 23: p 0 se upar aur 100 tak hi.",
          "line": "22-23",
          "vars": {
            "list": "—",
            "rank": "—",
            "val": "—"
          }
        },
        {
          "title": "2. p50, teen numbers",
          "say": "List [1, 2, 3], p = 50. Line 24: 0.5 × 3 = 1.5.",
          "line": "24",
          "vars": {
            "list": "1, 2, 3",
            "rank": "⌈1.5⌉ = ?",
            "val": "?"
          },
          "ask": {
            "q": "Line 24 Math.ceil(1.5) karti hai. Line 25 kaunsa number lautayegi?",
            "choices": [
              "2 — Math.ceil 1.5 ko 2 karta hai; sorted[2 − 1] list ka doosra number hai",
              "1 — 1.5 ko neeche round karke rank 1, toh sabse chhota number",
              "1.5 — percentile hamesha list ke do numbers ke beech ka ausat hota hai"
            ],
            "answer": 0,
            "hint": "Math.ceil upar round karta hai ya neeche?",
            "explain": "Math.ceil(1.5) = 2. Line 25: sorted[2 − 1] = sorted[1] = 2. Nearest-rank niyam hamesha list ka asli number deta hai — beech ka ausat nahi. Lab ka test yahi jaanchta hai.",
            "choiceExplanations": [
              "Math.ceil(1.5) = 2. Line 25: sorted[2 − 1] = sorted[1] = 2. Nearest-rank niyam hamesha list ka asli number deta hai — beech ka ausat nahi. Lab ka test yahi jaanchta hai.",
              "Neeche round karna Math.floor hai. Lab ka test [1, 2, 3] ka p50 = 2 maangta hai.",
              "Kuch tools beech ka ausat (interpolation) lete hain; ye function asli number lautata hai."
            ]
          }
        },
        {
          "title": "3. p99, das requests",
          "say": "Ab 10 requests wali list (12 … 900), p = 99. Line 24: 0.99 × 10 = 9.9.",
          "line": "24-25",
          "vars": {
            "list": "12, 14, 15, 15, 16, 18, 19, 21, 25, 900",
            "rank": "⌈9.9⌉ = ?",
            "val": "?"
          },
          "ask": {
            "q": "10 requests ki list par p99 kya aayega?",
            "choices": [
              "900 ms — rank ⌈9.9⌉ = 10, yaani sabse dheemi request; 10 samples mein p99 = max",
              "25 ms — p99 hamesha sabse dheemi request se ek pehle wali request hoti hai",
              "891 ms — 900 ka 99%, kyunki p99 sabse bade number ka 99% hissa hai"
            ],
            "answer": 0,
            "hint": "Rank 10 list mein kahan hai?",
            "explain": "⌈9.9⌉ = 10 → sorted[9] = 900 ms, list ka max. 10 samples se p99 ka asli matlab (100 mein 1) naapa hi nahi ja sakta — sirf max milta hai. p99 ke liye kam se kam saikdon samples chahiye; p99.9 ke liye hazaaron.",
            "choiceExplanations": [
              "⌈9.9⌉ = 10 → sorted[9] = 900 ms, list ka max. 10 samples se p99 ka asli matlab (100 mein 1) naapa hi nahi ja sakta — sirf max milta hai. p99 ke liye kam se kam saikdon samples chahiye; p99.9 ke liye hazaaron.",
              "Rank 9 p90 thi (25 ms). p99 ki rank 10 hai.",
              "Percentile list ka ek asli number hai, kisi number ka hissa nahi."
            ]
          }
        }
      ],
      "lesson": "Rank = ⌈p% × N⌉, aur jawab hamesha list ka ek asli number. Chhoti list par p99 bas max hai — tail naapne ke liye bahut samples chahiye."
    },
    {
      "type": "dryrun",
      "title": "🧍 queueRun(): line ka hisaab teen lines mein",
      "goal": "lib/sim.js. Har request ka aana (t), worker kab free (freeAt), aur kaam (svc). Wahi 6 requests: 0, 3, 6, 9, 40, 65 ms, kaam 10 ms (fixed).",
      "code": {
        "title": "lib/sim.js",
        "file": "docker-labs/52-scale-math/lib/sim.js",
        "from": 45,
        "text": "function queueRun(seed, n, rho, serviceMs, service) {\n  if (!(rho > 0 && rho < 1)) throw new Error('queueRun: rho must be in (0, 1)');\n  if (service !== 'random' && service !== 'fixed') throw new Error('queueRun: unknown service ' + service);\n  const rand = rng(seed);\n  const gapMean = serviceMs / rho;\n  const resp = new Array(n);\n  const waits = new Array(n);\n  let t = 0, freeAt = 0, busy = 0;\n  for (let i = 0; i < n; i++) {\n    t += exp(rand, gapMean);\n    const svc = service === 'fixed' ? serviceMs : exp(rand, serviceMs);\n    const start = Math.max(t, freeAt);\n    freeAt = start + svc;\n    busy += svc;\n    waits[i] = start - t;\n    resp[i] = freeAt - t;\n  }\n  return { resp, waits, busyShare: busy / freeAt };\n}"
      },
      "vars": [
        {
          "id": "t",
          "label": "t (aaya)"
        },
        {
          "id": "free",
          "label": "freeAt"
        },
        {
          "id": "wait",
          "label": "wait"
        }
      ],
      "steps": [
        {
          "title": "1. Aane ka faasla",
          "say": "Line 49: gapMean = serviceMs ÷ rho. 10 ms kaam aur 90% load par requests ausatan har 11.1 ms par. Line 54: har agla aana random faasle par (yahan hum haath ki list lete hain).",
          "line": "49-54",
          "vars": {
            "t": "—",
            "free": "0",
            "wait": "—"
          }
        },
        {
          "title": "2. #1 aur #2",
          "say": "#1: t = 0. Line 56: start = max(0, 0) = 0. Line 57: freeAt = 10. #2: t = 3, start = max(3, 10) = 10, freeAt = 20, wait = 7.",
          "line": "56-59",
          "vars": {
            "t": "3",
            "free": "20",
            "wait": "#1: 0 · #2: 7"
          }
        },
        {
          "title": "3. #4",
          "say": "#3: start 20, freeAt 30, wait 14. Ab #4: t = 9.",
          "line": "56-60",
          "vars": {
            "t": "9",
            "free": "30",
            "wait": "#4: ?"
          },
          "ask": {
            "q": "#4 ke liye line 56 aur 59 kya nikaalengi?",
            "choices": [
              "start = max(9, 30) = 30, wait = 30 − 9 = 21 ms",
              "start = max(9, 30) = 9, wait = 0 — #4 abhi aaya hai",
              "start = 9 + 10 = 19, wait = 10 ms — ek request ka kaam"
            ],
            "answer": 0,
            "hint": "max(9, 30) kya hai?",
            "explain": "max(9, 30) = 30: worker 30 tak busy. wait = start − t = 21 ms. Line 57: freeAt = 40. Poori line ka hisaab bas yahi recursion hai (Lindley): start = max(aana, worker free).",
            "choiceExplanations": [
              "max(9, 30) = 30: worker 30 tak busy. wait = start − t = 21 ms. Line 57: freeAt = 40. Poori line ka hisaab bas yahi recursion hai (Lindley): start = max(aana, worker free).",
              "max do mein bada number deta hai: 30. #4 ko worker ke free hone tak rukna hai.",
              "#4 ke aage teen requests ka kaam bacha tha; ek request ka kaam nahi."
            ]
          }
        },
        {
          "title": "4. #5, #6 aur busy share",
          "say": "#5: t = 40 = freeAt, wait 0. #6: t = 65, worker 50 se free, wait 0. Line 62: busyShare = busy ÷ freeAt = 60 ÷ 75 = 80%.",
          "line": "56-62",
          "vars": {
            "t": "65",
            "free": "75",
            "wait": "kul 42 ms"
          }
        }
      ],
      "lesson": "Line ka poora hisaab: start = max(aana, worker free); freeAt = start + kaam; wait = start − aana. Random aana (line 54) aur random kaam (line 55) se knee banta hai."
    },
    {
      "type": "cards",
      "title": "🔒 lock() aur ek naapne wala bug",
      "goal": "ex4 ka akela hissa ek shared lock hai. lib/work.js ka lock() aur pool ki ginti — dono ko dekho.",
      "lesson": "Lock ek waqt ek worker ko andar jaane deta hai. Experiment mein locked hissa har worker count par barabar hona chahiye — warna aap workers badhane ka asar nahi, apna bug naap rahe ho.",
      "steps": [
        {
          "title": "1. lock() kaise kaam karta hai",
          "say": "<code>Atomics.compareExchange(cell, 0, 0, 1)</code>: cell 0 (khaali) ho toh 1 (pakda) kar do, ek hi atomic kadam mein. Doosra worker 1 dekhta hai aur <code>Atomics.wait</code> par so jaata hai. <code>unlock()</code> cell ko 0 karke ek sote worker ko jagata hai (<code>Atomics.notify</code>)."
        },
        {
          "title": "2. Bina lock kya hota?",
          "say": "Lab ka test: 4 threads saath shuru, har ek 1,00,000 baar <code>count = count + 1</code>. Lock ke saath 4,00,000. Bina lock 4-thread run 4 lakh mein se ~1.4–1.6 lakh hi ginta hai — do threads ek hi purana count padh ke ek-doosre ka likha mita dete hain."
        },
        {
          "title": "3. Codex ne pakda: 100 nahi, 108",
          "say": "Pehle har worker apne units 0 se ginta tha aur har 20th unit par lock leta tha. Har worker apni ginti upar round karta: 12 workers par 2000 units mein 100 ki jagah 108 locked units (5.4%), 20% wale mein 408.",
          "ask": {
            "q": "12 workers, har ek ~167 units, har worker i = 0 se ginta hai aur i % 20 === 0 par lock. Ye ginti galat kyun?",
            "choices": [
              "Har worker apni ginti 0 se shuru karta hai, toh har worker 9 lock leta hai: kul 108",
              "Kuch galat nahi — 167 ÷ 20 = 8.35, toh har worker 8 lock leta hai: kul 96",
              "Galat isliye ki lock har worker ke aakhri unit par lagna chahiye, pehle par nahi"
            ],
            "answer": 0,
            "hint": "i = 0, 20, 40 … 160: 167 units mein kitne multiples of 20?",
            "explain": "0, 20, … 160 = 9 locks har worker. 12 × 9 = 108, yaani 5.4% — har worker count par alag share. Ilaaj: global numbering (worker ko start offset do, lock tab jab start + i, 20 ka multiple ho). Ab har count par theek 100 aur 400 locked units.",
            "choiceExplanations": [
              "0, 20, … 160 = 9 locks har worker. 12 × 9 = 108, yaani 5.4% — har worker count par alag share. Ilaaj: global numbering (worker ko start offset do, lock tab jab start + i, 20 ka multiple ho). Ab har count par theek 100 aur 400 locked units.",
              "i = 0 bhi ginti mein hai, toh 9 lock (0 se 160 tak), 8 nahi.",
              "Lock kis unit par lage, asli dikkat nahi; har worker ka round-up dikkat hai — total share badal jaata hai."
            ]
          }
        },
        {
          "title": "4. Ab lock naapa bhi jaata hai",
          "say": "Worker ab lock ke andar aur intezaar ka samay bhi jodta hai. ex4 ki lock detail: 20% lock 8–12 workers par wall time ka 88–89% held (lock chhodne se pehle naapa), har lock ka intezaar ~1.1 → ~2.2 ms. Andaaza nahi, naap. Codex ne yahan bhi ek bug pakda tha: pehle ghadi unlock ke baad padhi jaati thi, toh held time ~6 points zyada aata tha."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Haath ke udaharan aur tests",
      "project": "52-scale-math",
      "exercise": "ex0-slowmo",
      "goal": "Teeno chhote udaharan ek saath, phir lab ke 13 tests (do tests asli worker threads chalate hain).",
      "why": "Node 22+ chahiye. slowmo har baar same output deta hai. Tests ka samay machine par badlega.",
      "steps": [
        {
          "text": "Lab folder se: tail, fanout aur queue ke chhote udaharan.",
          "cmd": "cd docker-labs/52-scale-math && npm start -- ex0-slowmo",
          "expect": "== tail: 10 requests (ms) ==\nas they came : 16, 12, 25, 15, 900, 14, 19, 15, 21, 18\nsorted       : 12, 14, 15, 15, 16, 18, 19, 21, 25, 900\nmean         : 1055 ÷ 10 = 105.5 ms\np50 (rank 5) : 16 ms\np90 (rank 9) : 25 ms\np100 (max)   : 900 ms\nwithin ±20% of the mean (84–127 ms): 0 requests\n\n== fanout: each page calls 3 services in parallel and waits for all (ms) ==\npage A: calls 12, 14, 11 → page time 14 ms\npage B: calls 13, 1000, 12 → page time 1000 ms\npage C: calls 11, 15, 14 → page time 15 ms\nchance a page has no slow call, 1% slow per call:\n    1 calls: 0.99^1 = 0.990 → slow pages 1.0%\n    3 calls: 0.99^3 = 0.970 → slow pages 3.0%\n   10 calls: 0.99^10 = 0.904 → slow pages 9.6%\n  100 calls: 0.99^100 = 0.366 → slow pages 63.4%\n\n== queue: one worker, 10 ms per request; 6 × 10 = 60 ms of work, all inside 0–75 ms → busy 80% of that window ==\n#1: arrives  0  starts  0  ends 10  waited  0 ms\n#2: arrives  3  starts 10  ends 20  waited  7 ms\n#3: arrives  6  starts 20  ends 30  waited 14 ms\n#4: arrives  9  starts 30  ends 40  waited 21 ms\n#5: arrives 40  starts 40  ends 50  waited  0 ms\n#6: arrives 65  starts 65  ends 75  waited  0 ms\ntotal wait: 42 ms; evenly spread (every 12.5 ms) no request would wait"
        },
        {
          "text": "Saare tests.",
          "cmd": "npm test",
          "expect": "✔ percentile: nearest rank, and bad input is refused (1.330437ms)\n✔ same seed gives the same numbers; another seed differs (2.187035ms)\n✔ tail: mean lands far above the median when 1.5% are slow (12.215986ms)\n✔ fanout: independent slowness follows 1 − 0.99^N; shared slowness stays near 1% (119.716042ms)\n✔ knee: simulated mean matches queue theory at 50% and 80% load (156.903146ms)\n✔ hedge (seed 52 samples): helps independent stragglers at low load; not these heavy-request runs; runs away without a budget (449.573837ms)\n✔ hedge budget is never exceeded, even on tiny samples (1.027331ms)\n✔ cancel drops spare copies still in line, lets running ones finish, and beats budget-only when busy (301.284744ms)\n✔ heavy duplicates: extra service time counts milliseconds, not copies (122.641946ms)\n✔ amdahl pool: the locked share is the same at every worker count (445.083448ms)\n✔ heap pops in time order, ties by sequence (0.342954ms)\n✔ amdahl formula: 5% serial caps the speed-up at 20× (0.080079ms)\n✔ shared lock: 4 real worker threads start together; 1,00,000 unguarded increments each, final count exact (75.787901ms)\nℹ tests 13\nℹ suites 0\nℹ pass 13\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0\nℹ duration_ms 1741.627757"
        }
      ],
      "observe": {
        "q": "Locked units wala pool test 400 units par theek 20 locked maangta hai. Purani per-worker ginti 12 workers par kitne deti?",
        "choices": [
          "24 — har worker 0 aur 20 par lock leta: 12 × 2, aur test fail",
          "20 — 400 ÷ 20 = 20; worker kitne bhi hon, kul ginti hamesha 20 hi rehti",
          "12 — har worker sirf ek baar lock leta, apne bilkul pehle unit par hi"
        ],
        "answer": 0,
        "hint": "33 units mein i = 0 se kitne multiples of 20?",
        "explain": "33 ya 34 units mein i = 0 aur i = 20, dono par lock: har worker 2. 12 × 2 = 24 ≠ 20, toh test fail hota. Global numbering ke saath 0, 20, …, 380 = theek 20. Isliye test 1, 5 aur 12 workers par ginta hai.",
        "choiceExplanations": [
          "33 ya 34 units mein i = 0 aur i = 20, dono par lock: har worker 2. 12 × 2 = 24 ≠ 20, toh test fail hota. Global numbering ke saath 0, 20, …, 380 = theek 20. Isliye test 1, 5 aur 12 workers par ginta hai.",
          "400 ÷ 20 global ginti ka jawab hai; per-worker ginti har worker par round up karti hai.",
          "i = 20 bhi 33 units ke andar hai, toh har worker 2 lock leta hai."
        ]
      },
      "lesson": "Code chhota hai: rank ka ek niyam, line ki teen lines, aur ek atomic lock. Naapne wale code ke bug bhi numbers badal dete hain — tests ginti ke bugs pakadte hain."
    }
  ],
  "interview": {
    "title": "Interview Round — naap ka code",
    "instructions": "Pehle socho: number kaise nikla, kitne samples se, aur code ki kaunsi line number badal sakti hai? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Load test 50 requests ka chala aur report kehti hai: p99 = 812 ms. Teammate is p99 par SLO tay karna chahta hai. Aapki salaah?",
        "choices": [
          "50 samples par p99 = sabse dheemi request; zyada requests chalao, phir tay karo",
          "Theek hai — p99 ka formula sample size par depend nahi karta, 50 kaafi hain",
          "p99 ki jagah ausat lo — 50 requests mein ausat zyada bharose layak hai",
          "812 ms ko 99% se guna karo — sahi p99 lagbhag 804 ms hoga"
        ],
        "answer": 0,
        "explain": "Nearest rank: ⌈0.99 × 50⌉ = 50 → list ka aakhri number, yaani max. Ek request ki kismat par SLO tay ho jaayega. p99 ke liye saikdon-hazaaron samples chahiye, aur kai runs.",
        "choiceExplanations": [
          "Nearest rank: ⌈0.99 × 50⌉ = 50 → list ka aakhri number, yaani max. Ek request ki kismat par SLO tay ho jaayega. p99 ke liye saikdon-hazaaron samples chahiye, aur kai runs.",
          "Rank N par depend karti hai: 50 samples par p99 = max.",
          "Ausat tail chhupata hai; SLO ka sawaal tail ka hai.",
          "Percentile list ka ek asli number hai; 99% se guna ka koi matlab nahi."
        ]
      },
      {
        "q": "Ek dev 2,000 units 8 threads mein baanta hai (har thread 250): har thread apna loop i = 0 se chalata hai aur \"har 20th kaam par global lock\" leta hai. Benchmark kehta hai 5% serial. Kya check karoge?",
        "choices": [
          "Locked units gino — har thread 0 se gine toh round-up se share 5% se badh sakta hai",
          "Kuch nahi — har 20th kaam = 5%, thread kitne bhi hon, share hamesha theek 5% rehta hai",
          "Lock ko spinlock se mutex karo — lock ka type serial share ko 5% se kam kar deta hai",
          "Threads 8 se 64 kar do — zyada threads par 5% ka asar apne aap ghat jaata hai"
        ],
        "answer": 0,
        "explain": "250 units mein i = 0, 20, …, 240: har thread 13 lock, kul 104 = 5.2%, 5% nahi. Har thread apni ginti upar round karta hai (200 units par 10 lock — tab theek 5%). Lab 52 mein yahi bug tha: 12 workers par 100 ki jagah 108 locked units. Benchmark ka 'serial share' naapo — locked units gino, lock ka held time jodo.",
        "choiceExplanations": [
          "250 units mein i = 0, 20, …, 240: har thread 13 lock, kul 104 = 5.2%, 5% nahi. Har thread apni ginti upar round karta hai (200 units par 10 lock — tab theek 5%). Lab 52 mein yahi bug tha: 12 workers par 100 ki jagah 108 locked units. Benchmark ka 'serial share' naapo — locked units gino, lock ka held time jodo.",
          "Share thread count aur units par badalta hai: yahan 5.2%, lab mein 12 workers par 5.4%.",
          "Lock ka type wait ka tareeka badalta hai, locked kaam ki ginti nahi.",
          "Locked kaam ek waqt ek worker hi karta hai; threads badhane se locked kaam ki ginti nahi ghatti."
        ]
      }
    ]
  },
  "success": [
    "Nearest-rank se percentile nikaal sakte ho, aur chhoti list ki seema bata sakte ho",
    "Line ka hisaab start = max(aana, free) se kar sakte ho",
    "Lock aur benchmark ke share ko jaanch sakte ho"
  ],
  "cards": [
    {
      "front": "Nearest-rank percentile?",
      "back": "List sort karo, rank = ⌈p% × N⌉, us rank ka number. [1, 2, 3] ka p50 = 2. 10 samples par p99 = max."
    },
    {
      "front": "Line ka intezaar code mein?",
      "back": "start = max(aana, worker free); free = start + kaam; wait = start − aana. Bas itna — baaki random aana aur kaam."
    },
    {
      "front": "Benchmark ka serial share kaise jaancho?",
      "back": "Locked units gino aur lock ka held time naapo. Lab 52: per-worker ginti se 5% asal mein 5.4% ho gaya tha."
    }
  ]
}
]);
})();
