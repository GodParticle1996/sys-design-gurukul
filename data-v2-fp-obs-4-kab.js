/* First Principles — FAANG Senior Engineer.
   Source credit: Observability — How to Not Fly Blind (jwVEgkBDyM8), numbered video 14/15.
   Evidence: docker-labs/64-observability/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "err", "icon": "❌", "label": "Errors", "x": 140, "y": 210}, {"id": "bud", "icon": "💰", "label": "Error budget", "x": 460, "y": 210}, {"id": "page", "icon": "📟", "label": "Page", "x": 790, "y": 90}, {"id": "tick", "icon": "🎫", "label": "Ticket", "x": 790, "y": 330}];
const EDGES = [{"from": "err", "to": "bud"}, {"from": "bud", "to": "page"}, {"from": "bud", "to": "tick"}];
VISUALS["fp-obs-kab"] = { t: "Errors budget jalate hain. Tez jalan par page, dheemi jalan par ticket, chhote jhatke par subah.", html: SD.viz.svg(HERO, EDGES, { nodes: { err: {tone:'busy',badge:'errors'}, bud: {tone:'ok',badge:'43.2 min'}, page: {tone:'bad',badge:'tez jalan'}, tick: {tone:'busy',badge:'dheemi'} } }, {w:900,h:420}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-obs-kab",
  "icon": "💰",
  "group": "🔭 Observability: Andhe Mat Udo",
  "title": "Observability 4 · Kab — error budget, alert aur culture",
  "badge": "Budget Ka Rakhwala",
  "objectives": [
    "Error budget ka hisaab aur freeze ka faisla",
    "Seedha threshold vs burn-rate alert",
    "SLO/SLA, dashboard ke teen tal, blameless postmortem"
  ],
  "lesson": [
    "<h3>📱 Mobile ka data pack</h3><p>Mahine ka 30 GB data pack. 10 din mein 5 GB gaya — befikr video dekho. 15 din mein 28 GB gaya — ab sirf zaroori kaam.</p><p>Aur alert? \"Har baar 100 MB khatam ho toh call karo\" — din mein das call, sab bekaar. \"Is raftaar se pack 3 din mein khatam\" — ek kaam ka call. Aaj reliability ko isi tarah ke budget aur alerts se dekhte hain.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "💰 43 minute ka budget — kab ship, kab ruko, kab jagao?",
      "goal": "Lab 64 ex4 (model: 30 din ka mahina, minute-dar-minute, traffic barabar; incident din 10 par). SLO 99.9%. Teen tarah ke alert: video ka 1% rule, seedha threshold (error rate ≥ 0.1%, 10 min ka chalta average — SRE Workbook approach 1) aur Workbook ke burn-rate alerts.",
      "nodes": [
        {
          "id": "err",
          "icon": "❌",
          "label": "Errors",
          "x": 140,
          "y": 210
        },
        {
          "id": "bud",
          "icon": "💰",
          "label": "Error budget",
          "x": 460,
          "y": 210
        },
        {
          "id": "page",
          "icon": "📟",
          "label": "Page",
          "x": 790,
          "y": 90
        },
        {
          "id": "tick",
          "icon": "🎫",
          "label": "Ticket",
          "x": 790,
          "y": 330
        }
      ],
      "edges": [
        {
          "from": "err",
          "to": "bud"
        },
        {
          "from": "bud",
          "to": "page"
        },
        {
          "from": "bud",
          "to": "tick"
        }
      ],
      "viz": {
        "w": 900,
        "h": 420
      },
      "vars": [
        {
          "id": "case",
          "label": "Haalat"
        },
        {
          "id": "spent",
          "label": "Budget jala"
        },
        {
          "id": "alert",
          "label": "Alert"
        }
      ],
      "steps": [
        {
          "title": "1. Budget",
          "clock": "budget",
          "say": "99.9% × 30 din: 0.1% × 43,200 min = 43.2 min poora band (ya utne hi \"poore fail minute\" ke barabar errors). 99.95% → 21.6 min, 99.99% → 4.32 min. Requests mein: 10 crore requests par 99.9% → 1,00,000 fail ho sakti hain.",
          "nodes": {
            "err": {
              "tone": "idle",
              "badge": ""
            },
            "bud": {
              "tone": "ok",
              "badge": "43.2 min"
            },
            "page": {
              "tone": "idle",
              "badge": ""
            },
            "tick": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "case": "SLO 99.9%",
            "spent": "0",
            "alert": "—"
          }
        },
        {
          "title": "2. Video ka mahina",
          "clock": "freeze",
          "say": "5 min kharch → 38.2 min bache: hari jhandi, ship karo. 2 hafte mein 40 min → 3.2 min bache: risky deploys rok, reliability par kaam.",
          "nodes": {
            "err": {
              "tone": "bad",
              "badge": "40 min"
            },
            "bud": {
              "tone": "bad",
              "badge": "3.2 bache"
            },
            "page": {
              "tone": "idle",
              "badge": ""
            },
            "tick": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "case": "2 hafte, 40 min",
            "spent": "92.6%",
            "alert": "freeze"
          },
          "ask": {
            "q": "Video: \"budget decides\". Asal mein budget ka faisla kaise chalta hai?",
            "choices": [
              "Pehle se likhi policy: budget khatam toh risky deploy rukte",
              "Budget khatam hote hi system apne aap saare deploy rok deta hai",
              "Budget sirf SRE team ke liye; product team ship karti rehti hai"
            ],
            "answer": 0,
            "hint": "Budget ek number hai. Number par amal kaun karata hai?",
            "explain": "Error budget ek number hai; faisla ek pehle se maani hui policy karti hai (Google SRE: error budget policy) — budget bacha toh ship, khatam toh risky changes ruke aur reliability ka kaam. Policy se \"tez chalo vs sambhal kar\" ki behas data par hoti hai. Koi jaadu ka switch nahi.",
            "choiceExplanations": [
              "Error budget ek number hai; faisla ek pehle se maani hui policy karti hai (Google SRE: error budget policy) — budget bacha toh ship, khatam toh risky changes ruke aur reliability ka kaam. Policy se \"tez chalo vs sambhal kar\" ki behas data par hoti hai. Koi jaadu ka switch nahi.",
              "Deploy rokna policy ka kaam hai, apne aap nahi hota.",
              "Policy dono teams ki saanjhi hoti hai."
            ]
          }
        },
        {
          "title": "3. Poora outage, 20 min",
          "clock": "outage",
          "say": "Budget ka 46.3% ek baar mein. Seedha threshold 1 min mein page; burn-rate (14.4, 1 ghanta + 5 min) bhi 1 min mein page.",
          "nodes": {
            "err": {
              "tone": "bad",
              "badge": "100%"
            },
            "bud": {
              "tone": "bad",
              "badge": "46.3%"
            },
            "page": {
              "tone": "bad",
              "badge": "1 min"
            },
            "tick": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "case": "outage 20 min",
            "spent": "46.3%",
            "alert": "dono: 1 min"
          },
          "flows": [
            {
              "from": "err",
              "to": "bud",
              "label": "",
              "tone": "bad"
            },
            {
              "from": "bud",
              "to": "page",
              "label": "",
              "tone": "bad"
            }
          ]
        },
        {
          "title": "4. 5% errors, 5 min",
          "clock": "jhatka",
          "say": "Budget ka sirf 0.58%. Seedha threshold (0.1%) 1 min mein page, video ka 1% rule 2 min mein — raat 3 baje. Burn-rate: 1 ghante ka average burn 4.2 — 14.4 se kam, koi page nahi.",
          "nodes": {
            "err": {
              "tone": "busy",
              "badge": "5%"
            },
            "bud": {
              "tone": "ok",
              "badge": "0.58%"
            },
            "page": {
              "tone": "busy",
              "badge": "threshold"
            },
            "tick": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "case": "5% × 5 min",
            "spent": "0.58%",
            "alert": "sirf threshold"
          },
          "ask": {
            "q": "5 minute ka jhatka, budget ka 0.58%, apne aap theek. Raat 3 baje page sahi tha?",
            "choices": [
              "Nahi — budget khatre mein nahi; aise page alert fatigue laate hain",
              "Haan — har error par insaan jagna chahiye, chahe kitna bhi chhota",
              "Haan — 5% error rate hamesha crisis hai, video ne bhi kaha tha"
            ],
            "answer": 0,
            "hint": "Page ka matlab: abhi insaan ka kaam chahiye. Kya is jhatke mein tha?",
            "explain": "Page tab jab budget sach mein khatre mein ho aur insaan kuch kar sake. 0.58% wala, khud theek hua jhatka subah dekhne layak hai. Baar-baar aise page aayein toh log alerts ko nazarandaaz karne lagte hain — aur asli page bhi chhoot jaata hai. Video ka \"5% crisis\" ek misaal hai; kitni der aur kitna budget, dono maayne rakhte hain.",
            "choiceExplanations": [
              "Page tab jab budget sach mein khatre mein ho aur insaan kuch kar sake. 0.58% wala, khud theek hua jhatka subah dekhne layak hai. Baar-baar aise page aayein toh log alerts ko nazarandaaz karne lagte hain — aur asli page bhi chhoot jaata hai. Video ka \"5% crisis\" ek misaal hai; kitni der aur kitna budget, dono maayne rakhte hain.",
              "Har error par jagana alert fatigue ka raasta hai.",
              "5 min ka 5% budget ka 0.58% hai; kitni der, dono maayne rakhte hain."
            ]
          }
        },
        {
          "title": "5. 2% errors, 6 ghante",
          "clock": "dheema",
          "say": "Kul 16.7% budget. Seedha threshold: 1 min. Burn-rate page: 44 min baad (tab tak 2.0% budget). Burn-rate ki keemat: der.",
          "nodes": {
            "err": {
              "tone": "busy",
              "badge": "2%"
            },
            "bud": {
              "tone": "busy",
              "badge": "16.7%"
            },
            "page": {
              "tone": "bad",
              "badge": "44 min"
            },
            "tick": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "case": "2% × 6 ghante",
            "spent": "16.7%",
            "alert": "threshold 1 min · burn 44 min"
          }
        },
        {
          "title": "6. 0.3% errors, 7 din",
          "clock": "jalan",
          "say": "Kul 70% budget — dheemi jalan. Video ka 1% rule kabhi nahi jagata (0.3% &lt; 1%). Seedha threshold (0.1%) 4 min mein page. Burn-rate page kabhi nahi; ticket (burn &gt; 1, 3 din + 6 ghante) ~1 din baad (1,441 min), 10% par.",
          "nodes": {
            "err": {
              "tone": "busy",
              "badge": "0.3%"
            },
            "bud": {
              "tone": "bad",
              "badge": "70%"
            },
            "page": {
              "tone": "idle",
              "badge": ""
            },
            "tick": {
              "tone": "busy",
              "badge": "1 din"
            }
          },
          "vars": {
            "case": "0.3% × 7 din",
            "spent": "70%",
            "alert": "ticket 1 din"
          },
          "flows": [
            {
              "from": "bud",
              "to": "tick",
              "label": "",
              "tone": "busy"
            }
          ],
          "ask": {
            "q": "7 din tak 0.3% errors, budget ka 70%. Burn-rate ne page nahi kiya, ticket diya. Theek?",
            "choices": [
              "Haan — jaldi nahi par zaroori; din mein dekhne wala ticket kaafi",
              "Nahi — har alert page hona chahiye, ticket koi bhi nahi padhta",
              "Nahi — 0.3% SLO ke andar hai, isliye koi alert nahi chahiye"
            ],
            "answer": 0,
            "hint": "0.3% ka burn rate kitna hai, aur kitni jaldi budget khatam hoga?",
            "explain": "0.1% budget par 0.3% errors = burn rate 3: poora mahine ka budget ~10 din mein. Raat 3 baje jagane ki jaldi nahi, par kaam zaroori — ticket. SRE Workbook ka ticket rule (burn &gt; 1, 3 din + 6 ghante) lab mein ~1 din baad (1,441 min) 10.01% par aata hai. 0.3% SLO (0.1%) se teen guna zyada hai.",
            "choiceExplanations": [
              "0.1% budget par 0.3% errors = burn rate 3: poora mahine ka budget ~10 din mein. Raat 3 baje jagane ki jaldi nahi, par kaam zaroori — ticket. SRE Workbook ka ticket rule (burn &gt; 1, 3 din + 6 ghante) lab mein ~1 din baad (1,441 min) 10.01% par aata hai. 0.3% SLO (0.1%) se teen guna zyada hai.",
              "Ticket ka matlab: kaam ki line mein, insaan din mein dekhe.",
              "0.3% > 0.1% — SLO se bahar hai."
            ]
          }
        }
      ],
      "lesson": "Error budget reliability ko ginti bana deta hai. Seedha threshold sab jaldi pakadta hai par chhote jhatkon par bhi jagata hai. Burn-rate alerts budget ke khatre par page, dheemi jalan par ticket — keemat thodi der. Chunaav: precision, recall, detection time, reset time."
    },
    {
      "type": "cards",
      "title": "🧭 SLO, dashboard aur culture",
      "goal": "Video ke aakhri hisse: SLI/SLO/SLA, dashboard kaisa ho, aur incident ke baad kya poochein.",
      "lesson": "SLO SLA se kadak rakho. Page aur laal hone wale har number ke saath ek action; jaanch aur planning ke graph ka ek saaf sawaal ho. Incident ke baad \"kisne kiya\" nahi, \"system ne kya hone diya\" poochho.",
      "steps": [
        {
          "title": "1. SLI, SLO, SLA",
          "say": "SLI = naap (p99 latency, error rate). SLO = andar ka lakshya (p99 &lt; 500 ms, 99.9%). SLA = customer se contract (99.9% se kam toh refund). Video: SLO SLA se kadak — SLA 99.9% toh SLO 99.95% (budget 21.6 min), taaki SLA tootne se pehle pata chale."
        },
        {
          "title": "2. Dashboard: teen tal",
          "say": "Video: 3 baje raat sau ghoomti suiyan bekaar. Upar: chaar golden signals (latency, traffic, errors, saturation). Beech: kaunsa component bimar. Neeche: traces aur logs. Video: \"jis number par action nahi, hatao\" — page aur laal hone wale number ke liye sahi; jaanch aur planning ke graph bina turant action ke bhi kaam ke.",
          "ask": {
            "q": "Dashboard par \"JVM heap 85%\" ka graph laal hota rehta hai, par kisi ko nahi pata laal hone par kya karein. Sahi kadam?",
            "choices": [
              "Laal hone ka action likho ya alert hatao; bina action ka laal shor hai",
              "Graph rakho aur laal hone par sabko page karo, taaki koi dekhe",
              "Graph ka rang badal do taaki laal na dikhe aur log pareshan na hon"
            ],
            "answer": 0,
            "hint": "Ek number laal hua — agla kadam kya? Pata nahi toh number kya kar raha?",
            "explain": "Laal rang (ya page) ka matlab: abhi kuch karo. Heap 85% JVM ke liye aam ho sakta hai (🛡️ observability level). Symptom (latency, errors) par alert; heap jaisa cause jaanch ke graph mein rakh sakte ho, par laal tabhi jab action likha ho. Bina action ka laal asli signal ko dabaata hai.",
            "choiceExplanations": [
              "Laal rang (ya page) ka matlab: abhi kuch karo. Heap 85% JVM ke liye aam ho sakta hai (🛡️ observability level). Symptom (latency, errors) par alert; heap jaisa cause jaanch ke graph mein rakh sakte ho, par laal tabhi jab action likha ho. Bina action ka laal asli signal ko dabaata hai.",
              "Bina action ka page alert fatigue badhata hai.",
              "Rang badalne se sawaal nahi badalta."
            ]
          }
        },
        {
          "title": "3. Blameless postmortem",
          "say": "Video: failure ek chain hai — buri query, review ne nahi pakdi, staging mein nahi dikhi, circuit breaker nahi khula, alert ki seema galat. Google SRE book: postmortem contributing causes dhoondhta hai, kisi insaan ya team par ilzaam nahi. Sazaa milegi toh log galtiyan chhupayenge — observability khud toot jaati hai.",
          "ask": {
            "q": "Ek developer ki query ne DB gira diya. Postmortem mein pehla sawaal kya ho?",
            "choices": [
              "System ne buri query ko production tak kaise jaane diya?",
              "Kis developer ne query likhi, aur developer ko kya sazaa milegi?",
              "Developer ko DB access se hata do, phir aage dekhenge"
            ],
            "answer": 0,
            "hint": "Agla developer bhi galti karega. Kya badle ki galti production tak na pahunche?",
            "explain": "Blameless postmortem system ki kamzoriyan dhoondhta hai: review, staging data, query timeout, circuit breaker, alert. Action items aisi galtiyon ko structure se mushkil banate hain. Insaan par ilzaam se log galtiyan chhupaate hain aur logs/incident reports imaandaar nahi rehte.",
            "choiceExplanations": [
              "Blameless postmortem system ki kamzoriyan dhoondhta hai: review, staging data, query timeout, circuit breaker, alert. Action items aisi galtiyon ko structure se mushkil banate hain. Insaan par ilzaam se log galtiyan chhupaate hain aur logs/incident reports imaandaar nahi rehte.",
              "Sazaa se galtiyan chhupti hain, kam nahi hoti.",
              "Access hatana ek insaan ko rokta hai, system ko nahi badalta."
            ]
          }
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Budget aur alerts ka model",
      "project": "64-observability",
      "exercise": "ex4-budget",
      "goal": "Budget ka hisaab, aur paanch incidents par seedha threshold vs burn-rate alerts.",
      "why": "Node 24+ chahiye. Model (30 din, minute-dar-minute) — har baar same output. Alert numbers SRE Workbook (\"Alerting on SLOs\") se.",
      "steps": [
        {
          "text": "Budget aur alerts.",
          "cmd": "cd docker-labs/64-observability && npm start -- ex4-budget",
          "expect": "ex4 — error budget aur alert (hisaab + ek mahine ka minute-dar-minute model; traffic barabar maana)\n\n1) Budget, 30 din ka mahina:\n   (budget = poora band rehne ke minute, ya utne hi \"poore fail minute\" ke barabar errors)\n   SLO 99.90% → 43.20 min\n   SLO 99.95% → 21.60 min\n   SLO 99.99% → 4.32 min\n   Video: 5 min kharch → 38.2 min bache (hari jhandi). 2 hafte mein 40 min → 3.2 min bache (deploy rok).\n   Requests mein bhi gin sakte ho: 10 crore requests/mahina, 99.9% → 1,00,000 fail ho sakti hain.\n\n2) Paanch incidents, SLO 99.9%. \"Kab\" = incident shuru hone ke kitne minute baad, (us waqt tak budget kitna jala):\n   V = PAGE: error rate ≥ 1%, 10 min (video ka 1%; window maana)\n   A = PAGE: error rate ≥ SLO ki seema (99.9% par 0.1%), 10 min  (SRE Workbook approach 1)\n   B = PAGE: burn > 14.4 (1 ghanta aur 5 min)\n   C = PAGE: burn > 6 (6 ghante aur 30 min)\n   D = TICKET: burn > 1 (3 din aur 6 ghante)\n   (V aur A: pichhle 10 min ka chalta average; B–D: SRE Workbook Table 5-8, lambi aur chhoti window dono upar hon)\n   incident                    poora jala   V               A               B               C               D\n   poora outage, 20 min          46.30%     1 min (2.31%)   1 min (2.31%)   1 min (2.31%)   3 min (6.94%)   5 min (11.57%)\n   2% errors, 6 ghante           16.67%     5 min (0.23%)   1 min (0.05%)   44 min (2.04%)  109 min (5.05%) 217 min (10.05%)\n   0.3% errors, 7 din            70.00%     —               4 min (0.03%)   —               —               1441 min (10.01%)\n   5% errors, 5 min               0.58%     2 min (0.23%)   1 min (0.12%)   —               —               —\n   0.2% errors, 10 min            0.05%     —               5 min (0.02%)   —               —               —\n\n   Outage khatam hone ke baad alert kitni der bajta raha (reset time): V 9 min · A 9 min · B 4 min · C 29 min · D 359 min\n   (chhoti window ki wajah se B 4 min mein chup; D ki chhoti window 6 ghante ki hai)\n\n   → Video ka 1% rule (V): 0.3% × 7 din (budget ka 70%) aur 0.2% kabhi nahi pakadta — par 5 min ke 5% jhatke par 2 min\n     mein jagata hai. Seedha threshold A (SLO ki seema) har incident 5 min ke andar pakadta hai, par 0.58% aur 0.05% budget\n     wale jhatkon par bhi raat 3 baje jagata hai. Aise page baar-baar aayein toh log alerts ko nazarandaaz karne lagte hain.\n   → Burn-rate alerts (B, C, D) sirf tab page karte hain jab budget sach mein khatre mein ho. Keemat: 2% wale 6 ghante ke\n     incident par page 44 min baad (tab tak 2% budget jal chuka). Dheemi jalan (0.3%, 7 din) par page nahi, ticket —\n     ~1 din baad, 10% budget par. Rule ka chunaav precision, recall, detection time aur reset time ka tradeoff hai;\n     Workbook ke numbers shuruaati maan hain, apne SLO aur traffic par tune karo."
        },
        {
          "text": "Lab ke 6 tests (simulation formulas se milti hai, alert numbers tay).",
          "cmd": "npm test",
          "expect": "✔ ex0: average, two p99 definitions, merged histograms (22.348249ms)\n✔ ex1: real HTTP mesh — tree from parent ids, skewed log order, broken propagation (1108.888262ms)\n✔ ex1: traceparent parsing and continuing a caller trace (10.80949ms)\n✔ ex2: costs and sampling (5.183804ms)\n✔ ex3: queue simulator matches the formulas (251.397423ms)\n✔ ex4: budget and alert rules (26.419589ms)\nℹ tests 6\nℹ suites 0\nℹ pass 6\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0\nℹ duration_ms 1482.801257"
        }
      ],
      "observe": {
        "q": "2% errors 6 ghante: seedha threshold 1 min mein, burn-rate page 44 min mein. Phir bhi SRE Workbook burn-rate kyun sujhata hai?",
        "choices": [
          "Threshold chhote jhatkon par bhi jagata; burn-rate khatre par",
          "Burn-rate hamesha tez hota hai, lab ka model hi galat hai",
          "Threshold alert ko chalane mein bahut zyada CPU lagta hai"
        ],
        "answer": 0,
        "hint": "Lab mein 5% × 5 min aur 0.2% × 10 min par kaun jaga?",
        "explain": "Seedha threshold ne paanchon incidents par page kiya — budget ke 0.58% aur 0.05% wale bhi. Burn-rate ne sirf budget ke khatre par page kiya, dheemi jalan par ticket. Keemat: medium incident par der (44 min, 2% budget). Workbook isi tradeoff ko precision, recall, detection time aur reset time se tolta hai.",
        "choiceExplanations": [
          "Seedha threshold ne paanchon incidents par page kiya — budget ke 0.58% aur 0.05% wale bhi. Burn-rate ne sirf budget ke khatre par page kiya, dheemi jalan par ticket. Keemat: medium incident par der (44 min, 2% budget). Workbook isi tradeoff ko precision, recall, detection time aur reset time se tolta hai.",
          "Lab mein 2% wale incident par burn-rate 44 min baad aaya — tez nahi.",
          "Sawaal page ki sankhya aur sahi-galat ka hai, CPU ka nahi."
        ]
      },
      "lesson": "Alert ka kaam insaan ko tab jagana jab insaan ki zaroorat ho. Budget ke hisaab se page aur ticket alag karo."
    }
  ],
  "interview": {
    "title": "Interview Round — budget aur alerts",
    "instructions": "Pehle socho: budget kitna bacha, kitni raftaar se jal raha, aur kya insaan abhi kuch kar sakta hai? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "SLO 99.9%. Team ki maani hui policy: 15% se kam budget bache toh risky feature releases rukte hain. Mahine ke 20 din mein 38 min budget jal gaya. PM kal ek bada naya feature ship karna chahta hai. Tumhari salah?",
        "choices": [
          "Policy lagu: risky release roko, pehle reliability ka kaam karo",
          "Ship karo — budget abhi bacha hai, 5 minute kaafi hain",
          "Ship karo aur SLO 99.5% kar do, taaki budget badh jaaye",
          "Feature ship karo, par monitoring band kar do taaki alert na bajein"
        ],
        "answer": 0,
        "explain": "43.2 mein se 38 gaye: 5.2 min (12.0%) bache, 10 din baaki — policy ki 15% seema se neeche, toh risky release rukta hai, reliability ke fixes chalte hain. Ek bura deploy SLO tod sakta hai. Policy pehle se likhi aur maani honi chahiye (Google SRE ki example policy budget khatam hone par rokti hai; jaldi rokna team ka apna niyam). SLO ghatana \"lakshya badalna\" hai, samasya nahi sulajhta.",
        "choiceExplanations": [
          "43.2 mein se 38 gaye: 5.2 min (12.0%) bache, 10 din baaki — policy ki 15% seema se neeche, toh risky release rukta hai, reliability ke fixes chalte hain. Ek bura deploy SLO tod sakta hai. Policy pehle se likhi aur maani honi chahiye (Google SRE ki example policy budget khatam hone par rokti hai; jaldi rokna team ka apna niyam). SLO ghatana \"lakshya badalna\" hai, samasya nahi sulajhta.",
          "5 min mein ek bura deploy budget khatam kar sakta hai.",
          "Galti chhupane ke liye SLO badalna bharosa todta hai.",
          "Monitoring band karna andhe udna hai — video ka pura mudda."
        ]
      },
      {
        "q": "Alert \"pichhle 10 min ka error rate ≥ 0.1%\" hafte mein 15 baar bajta hai; zyadatar khud theek ho jaata hai. On-call alerts nazarandaaz karne laga. Kya badloge?",
        "choices": [
          "Burn-rate alerts: budget khatre par page, dheemi jalan ticket",
          "Threshold 0.1% se 0.01% karo, taaki koi error na chhoot sake",
          "Alert hata do — SLO ka budget khud batayega jab dikkat ho",
          "On-call ko zyada log do, taaki har baar koi na koi jaage"
        ],
        "answer": 0,
        "explain": "Seedha threshold ka recall achha par precision kam (SRE Workbook: SLO ke andar rehte hue bhi bahut alerts). Burn-rate (&gt; 14.4 / 1 ghanta + 5 min, &gt; 6 / 6 ghante + 30 min) budget ke asli khatre par page; &gt; 1 (3 din + 6 ghante) ticket. Lab ex4: chhote jhatkon par burn-rate chup, outage par 1 min.",
        "choiceExplanations": [
          "Seedha threshold ka recall achha par precision kam (SRE Workbook: SLO ke andar rehte hue bhi bahut alerts). Burn-rate (&gt; 14.4 / 1 ghanta + 5 min, &gt; 6 / 6 ghante + 30 min) budget ke asli khatre par page; &gt; 1 (3 din + 6 ghante) ticket. Lab ex4: chhote jhatkon par burn-rate chup, outage par 1 min.",
          "0.01% se aur zyada bekaar page aayenge.",
          "Budget tabhi kaam ka jab koi budget dekhe — alert zaroori.",
          "Zyada log jagaana fatigue ka ilaaj nahi."
        ]
      }
    ]
  },
  "success": [
    "Error budget ka hisaab aur freeze ka faisla samjha sakte ho",
    "Threshold vs burn-rate alert ka tradeoff bata sakte ho",
    "Dashboard aur blameless postmortem ke niyam bata sakte ho"
  ],
  "cards": [
    {
      "front": "99.9% SLO, 30 din ka budget?",
      "back": "43.2 min (99.95% → 21.6, 99.99% → 4.32). Requests mein: 10 crore par 1,00,000 fail."
    },
    {
      "front": "Burn-rate alerts (SRE Workbook, 99.9%)?",
      "back": "Page: 14.4 (1 ghanta + 5 min, 2% budget), 6 (6 ghante + 30 min, 5%). Ticket: 1 (3 din + 6 ghante, 10%)."
    },
    {
      "front": "Seedha threshold vs burn-rate (lab 64 ex4)?",
      "back": "Threshold: har incident 5 min ke andar, par 0.58% aur 0.05% wale jhatkon par bhi page. Burn-rate: sirf budget khatre par; 2% × 6 ghante par 44 min der."
    }
  ]
}
]);
})();
