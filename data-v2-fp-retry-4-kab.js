/* First Principles — FAANG Senior Engineer.
   Source credit: Mathematics of the Second Attempt (s5HWkMyRRcA), numbered video 12/15.
   Evidence: docker-labs/62-second-attempt/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "user", "icon": "🙋", "label": "User (10 s)", "x": 110, "y": 190}, {"id": "a", "icon": "🅰️", "label": "Service A", "x": 340, "y": 190}, {"id": "b", "icon": "🅱️", "label": "Service B", "x": 570, "y": 190}, {"id": "c", "icon": "🐢", "label": "Service C", "x": 790, "y": 190}];
const EDGES = [{"from": "user", "to": "a"}, {"from": "a", "to": "b"}, {"from": "b", "to": "c"}];
VISUALS["fp-retry-kab"] = { t: "Deadline neeche tak jaati hai; samay khatam hone par service tabhi rukti hai jab cancel maane. Retries deadline ke andar.", html: SD.viz.svg(HERO, EDGES, { nodes: { user: {tone:'busy',badge:'10 s'}, a: {tone:'ok',badge:'har try ≤ 3 s'}, b: {tone:'ok',badge:'har try ≤ 1 s'}, c: {tone:'ok',badge:'cancel maana'} } }, {w:900,h:320}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-retry-kab",
  "icon": "⌛",
  "group": "🔁 Retries: Doosri Koshish",
  "title": "Retries 4 · Kab — deadline, DLQ, MTTR aur breaker",
  "badge": "Samay Ka Rakhwala",
  "objectives": [
    "Timeout vs deadline propagation; zombie kaam",
    "Retries ko deadline mein fit karna",
    "DLQ retention, MTBF/MTTR, circuit breaker"
  ],
  "lesson": [
    "<h3>🍕 Pizza order</h3><p>Tum 30 minute mein pizza chahte ho. Counter wala kitchen ko order deta hai, kitchen supplier se cheese mangwata hai. 30 minute baad tum chale jaate ho — par kisi ne kitchen ko nahi bataya. Kitchen pizza banata hai, supplier cheese laata hai, sab bekaar.</p><p>Agar order par likha ho \"9:30 tak\", toh har koi dekh sakta hai ki samay bacha ya nahi. Aaj dekhte hain deadline neeche tak kaise bhejein, aur fail hue kaam ka kya karein.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "⌛ User chala gaya — C ab bhi kaam kyun kar raha hai?",
      "goal": "Lab 62 ex2 (asli ginti, ek request ki timeline): user → A → B → C. C ek baar 20 s latak gaya. User 10 s par chala jaata hai. Har layer 3 koshish, 100 ms backoff.",
      "nodes": [
        {
          "id": "user",
          "icon": "🙋",
          "label": "User (10 s)",
          "x": 110,
          "y": 190
        },
        {
          "id": "a",
          "icon": "🅰️",
          "label": "Service A",
          "x": 340,
          "y": 190
        },
        {
          "id": "b",
          "icon": "🅱️",
          "label": "Service B",
          "x": 570,
          "y": 190
        },
        {
          "id": "c",
          "icon": "🐢",
          "label": "Service C",
          "x": 790,
          "y": 190
        }
      ],
      "edges": [
        {
          "from": "user",
          "to": "a"
        },
        {
          "from": "a",
          "to": "b"
        },
        {
          "from": "b",
          "to": "c"
        }
      ],
      "viz": {
        "w": 900,
        "h": 320
      },
      "vars": [
        {
          "id": "way",
          "label": "Tareeka"
        },
        {
          "id": "ccalls",
          "label": "C par calls"
        },
        {
          "id": "zombie",
          "label": "User ke baad bekaar kaam"
        }
      ],
      "steps": [
        {
          "title": "Lambe timeouts",
          "clock": "30 s timeouts",
          "say": "A→B aur B→C ka timeout 30 s. C 20 s mein jawab deta hai, par user 10 s par ja chuka. Teeno threads 20 s atke.",
          "nodes": {
            "user": {
              "tone": "bad",
              "badge": "ja chuka"
            },
            "a": {
              "tone": "busy",
              "badge": "20 s"
            },
            "b": {
              "tone": "busy",
              "badge": "20 s"
            },
            "c": {
              "tone": "busy",
              "badge": "20 s"
            }
          },
          "vars": {
            "way": "30 s, deadline nahi",
            "ccalls": "1",
            "zombie": "30 s"
          },
          "flows": [
            {
              "from": "user",
              "to": "a",
              "label": "",
              "tone": "bad"
            },
            {
              "from": "a",
              "to": "b",
              "label": "",
              "tone": "busy"
            },
            {
              "from": "b",
              "to": "c",
              "label": "",
              "tone": "busy"
            }
          ]
        },
        {
          "title": "Chhote timeouts",
          "clock": "chhote timeouts",
          "say": "A→B 3 s, B→C 1 s. A aur B jaldi chhodte hain. Par B ka timeout C ko cancel nahi karta: har retry C par naya 20 s ka kaam. 3 × 3 = 9 calls.",
          "nodes": {
            "user": {
              "tone": "bad",
              "badge": "error"
            },
            "a": {
              "tone": "ok",
              "badge": "9.2 s"
            },
            "b": {
              "tone": "ok",
              "badge": "9.6 s"
            },
            "c": {
              "tone": "bad",
              "badge": "9 kaam × 20 s"
            }
          },
          "vars": {
            "way": "chhote timeouts",
            "ccalls": "9",
            "zombie": "~128 s"
          },
          "flows": [
            {
              "from": "b",
              "to": "c",
              "label": "retry × 9",
              "tone": "bad"
            }
          ],
          "ask": {
            "q": "Timeouts chhote kiye, phir bhi C par 180 s ka kaam aur ~128 s user ke jaane ke baad. Kyun?",
            "choices": [
              "B ka timeout C ko rokta nahi; har retry C par naya lamba kaam shuru",
              "Chhote timeouts C ko dheema kar dete hain, isliye kaam badhta hai",
              "C ke paas zyada threads hain, isliye C khud hi kaam dohraata hai"
            ],
            "answer": 0,
            "hint": "B ne 1 s par haar maani. C ko kisne bataya ki ruk jao?",
            "explain": "Timeout caller ki taraf ka hai: B intezaar chhodta hai, C ko pata nahi. Har retry C par naya 20 s ka kaam. Video is bekaar kaam ko zombie processing kehta hai. Ilaaj: deadline aage bhejo, aur C deadline dekhe.",
            "choiceExplanations": [
              "Timeout caller ki taraf ka hai: B intezaar chhodta hai, C ko pata nahi. Har retry C par naya 20 s ka kaam. Video is bekaar kaam ko zombie processing kehta hai. Ilaaj: deadline aage bhejo, aur C deadline dekhe.",
              "C ki raftaar timeout se nahi badalti; C ko pata hi nahi.",
              "C apne aap kaam nahi dohraata; B ke retries naya kaam bhejte hain."
            ]
          }
        },
        {
          "title": "Deadline propagation",
          "clock": "deadline",
          "say": "Har call ke saath \"kitna samay bacha\" jaata hai (jaise gRPC deadline). Sirf deadline bhejna kaafi nahi: C cancel na maane toh bekaar kaam phir ~128 s (lab). C apni deadline par ruke (cooperative cancellation) tabhi bekaar kaam 0 — is run mein C har call ki 1 s ki deadline par rukta hai.",
          "nodes": {
            "user": {
              "tone": "busy",
              "badge": "10 s"
            },
            "a": {
              "tone": "ok",
              "badge": "≤ 10 s"
            },
            "b": {
              "tone": "ok",
              "badge": "9 s"
            },
            "c": {
              "tone": "ok",
              "badge": "8.4 s, phir ruka"
            }
          },
          "vars": {
            "way": "deadline aage + C cancel maane",
            "ccalls": "9 (1 s mein ruke)",
            "zombie": "0"
          },
          "flows": [
            {
              "from": "a",
              "to": "b",
              "label": "≤ 3 s",
              "tone": "acc"
            },
            {
              "from": "b",
              "to": "c",
              "label": "≤ 1 s",
              "tone": "acc"
            }
          ]
        },
        {
          "title": "Retries aur deadline",
          "clock": "budget",
          "say": "Video ke 2/4/8 s backoff, 3 s timeout, 10 s deadline: koshish 1 (0–3 s), koshish 2 (5–8 s), koshish 3 (12 s) — user ja chuka. Sirf 2 koshishein kaam ki.",
          "nodes": {
            "user": {
              "tone": "busy",
              "badge": "10 s"
            },
            "a": {
              "tone": "ok",
              "badge": "2 koshish"
            },
            "b": {
              "tone": "idle",
              "badge": ""
            },
            "c": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "way": "backoff + deadline",
            "ccalls": "—",
            "zombie": "3rd retry bekaar"
          },
          "ask": {
            "q": "SDK default \"5 retries, exponential\" aur user ka timeout 10 s. Kya karna chahiye?",
            "choices": [
              "Koshishein deadline mein fit karo; samay khatam toh ruko",
              "5 retries rakho — zyada koshish matlab zyada success, hamesha",
              "Backoff hata do, taaki saari 5 koshishein 10 s mein ho jaayein"
            ],
            "answer": 0,
            "hint": "2 + 4 + 8 s ka backoff 10 s mein kitni koshishein chhodta hai?",
            "explain": "Retry ka kaam user ko jawab dena hai. Deadline ke baad ki koshish bekaar bojh hai (aur zombie kaam). Har koshish se pehle bacha samay dekho; na bache toh ruko. Backoff hataana bheed wapas laata hai.",
            "choiceExplanations": [
              "Retry ka kaam user ko jawab dena hai. Deadline ke baad ki koshish bekaar bojh hai (aur zombie kaam). Har koshish se pehle bacha samay dekho; na bache toh ruko. Backoff hataana bheed wapas laata hai.",
              "Deadline ke baad ka success user tak nahi pahunchta.",
              "Bina backoff retries ek saath — retry storm (level 1)."
            ]
          }
        }
      ],
      "lesson": "Har network call par timeout, aur deadline aage bhejo. Timeout caller ko bachata hai; deadline neeche wale ko batati hai — kaam tabhi rukta hai jab neeche wala cancel maane. Retries deadline ke andar hi."
    },
    {
      "type": "cards",
      "title": "🧰 Baaki teen auzaar: DLQ, MTTR, circuit breaker",
      "goal": "Lab 62 ex4 (arithmetic) aur lab 38 (circuit breaker). Video ki baatein sudhaar ke saath.",
      "lesson": "DLQ ki bhi retention aur alert chahiye. MTTR ghataao, par MTBF bhi ginti mein hai. Circuit breaker band service par retries rokta hai.",
      "steps": [
        {
          "title": "1. DLQ mein bhi data khota hai",
          "say": "Video: \"DLQ mein koi data kabhi nahi khota\". SQS standard queue mein message DLQ mein bhi apna pehla bheja-gaya samay rakhta hai — retention pehle bheje samay se ginti hai. DLQ retention 4 din, failures pehle 72 ghante mein barabar faile, aur har message 2 din baad dekha: 33% pehle hi mit gaye (lab ex4). FIFO queue mein samay DLQ mein dobara shuru hota hai. AWS: DLQ ki retention source se lambi rakho (max 14 din), aur depth par alert.",
          "ask": {
            "q": "SQS standard queue: source aur DLQ dono ki retention 4 din. Message 3 din baad DLQ mein gaya. DLQ mein kitna samay?",
            "choices": [
              "Lagbhag 1 din — retention pehle bheje samay se ginti hai",
              "4 din — DLQ mein aate hi retention phir se shuru hoti hai",
              "Hamesha — DLQ ke messages kabhi expire nahi hote"
            ],
            "answer": 0,
            "hint": "SQS standard queue mein DLQ mein jaane par enqueue samay badalta hai?",
            "explain": "Standard queue mein message ka asli enqueue samay rehta hai. 4 din − 3 din = ~1 din. Isliye DLQ ki retention source se lambi rakho, aur DLQ par alert lagao.",
            "choiceExplanations": [
              "Standard queue mein message ka asli enqueue samay rehta hai. 4 din − 3 din = ~1 din. Isliye DLQ ki retention source se lambi rakho, aur DLQ par alert lagao.",
              "Standard queue mein retention dobara shuru nahi hoti.",
              "SQS mein har message ki retention seemit hai (max 14 din)."
            ]
          }
        },
        {
          "title": "2. MTBF vs MTTR",
          "say": "Availability ≈ MTBF ÷ (MTBF + MTTR). Saal mein ek baar 24 ghante: 99.73% (~1,436 min band). Roz 100 ms mein khud theek: 99.9999% (~0.6 min). Video ka hisaab sahi — par \"khud jaldi theek\" tabhi jab retries ka loop MTTR ko ghanton tak na le jaaye (level 1)."
        },
        {
          "title": "3. Circuit breaker",
          "say": "Video: fail rate 50% par khulo, 30 s band, phir ek scout. Achha khaaka. Saath mein: kam traffic par minimum request ginti (2 mein 1 fail = 50%, par shor), aur half-open ke niyam. Asli servers par: lab 38. Breaker band service par retries rokta hai; Netflix jaise fallback (popular list) user ko girawat dikhne nahi deta."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Deadline aur DLQ",
      "project": "62-second-attempt",
      "exercise": "ex2-deadline",
      "goal": "User → A → B → C ki timeline teen policies par; phir DLQ retention aur availability ka hisaab.",
      "why": "Node 24+ chahiye. Seedha hisaab, har run same; koi asli server ya SQS nahi.",
      "steps": [
        {
          "text": "Deadline.",
          "cmd": "cd docker-labs/62-second-attempt && npm start -- ex2-deadline",
          "expect": "A. Arithmetic: user 10 s rukta hai. Har koshish ka timeout 3 s. Backoff video wala: 2 s, 4 s, 8 s.\n\n  koshish 1: 0–3 s ✓ deadline ke andar\n  koshish 2: 5–8 s ✓ deadline ke andar\n  koshish 3: 12–15 s ✗ user ja chuka (bekaar)\n  koshish 4: 23–26 s ✗ user ja chuka (bekaar)\n→ 10 s ki deadline mein sirf 2 koshishein fit. Retries ka total samay deadline se bada ho toh baaki retries bekaar kaam hain.\n\nB. ASLI ginti (ek request ki timeline): user → A → B → C. C ek baar 20 s latak gaya. User 10 s par chala jaata hai.\n   Har layer 3 koshish, beech mein 100 ms backoff. \"Deadline aage\" = caller ka intezaar khatam hone ka samay call ke saath jaata hai.\n   \"Cancel\" = neeche wala us samay par apna kaam rok deta hai (cooperative cancellation).\n\ntareeka                                                C par calls   thread-samay A / B / C        C ka bekaar kaam   user ke jaane ke baad\nlambe timeouts (30 s)                                       1       20.0 s / 20.0 s /  20.0 s        0.0 s         30.0 s\nchhote timeouts (A→B 3 s, B→C 1 s)                          9        9.2 s /  9.6 s / 180.0 s      180.0 s        127.8 s\nchhote timeouts + deadline aage, C cancel nahi maanta       9        9.2 s /  9.0 s / 180.0 s      180.0 s        127.8 s\nchhote timeouts + deadline aage + C cancel maanta           9        9.2 s /  9.0 s /   8.4 s        8.4 s          0.0 s\n\n→ Lambe timeouts: teeno threads 20 s atke, user 10 s par ja chuka (C ka jawab B tak pahuncha, par user tak nahi).\n→ Chhote timeouts: A aur B jaldi chhodte hain, par timeout sirf caller ka intezaar khatam karta hai — C ko pata nahi. Har retry C par\n  naya 20 s ka kaam (3 × 3 = 9 calls): ~128 s kaam user ke jaane ke baad (video ka shabd: zombie processing).\n→ Deadline aage bhejna akele kaafi nahi: C cancel na maane toh utna hi bekaar kaam. C deadline par ruke tabhi bekaar kaam ghata —\n  is run mein C har call ki 1 s ki deadline par rukta hai. gRPC deadline bhejta hai, par kaam rokna application ki zimmedari."
        },
        {
          "text": "DLQ aur MTTR.",
          "cmd": "npm start -- ex4-dlq-mttr",
          "expect": "A. Arithmetic (SQS STANDARD queue): message DLQ mein jaakar bhi apna PEHLA bheja-gaya samay rakhta hai, isliye DLQ ki\n   retention pehli baar bheje jaane se ginti hai. Maana: messages pehle 72 ghante mein barabar faile hue samay par DLQ mein\n   aate hain, aur har message ko DLQ mein aane ke itne ghante baad koi dekhta hai. Source retention 4 din.\n\nqueue      DLQ retention   koi dekhta hai (DLQ mein aane ke baad)   jaanch se pehle mit gaye\nstandard      4 din          48 ghante baad                            33%\nstandard      4 din          12 ghante baad                             0%\nstandard     14 din          48 ghante baad                             0%\nstandard     14 din         300 ghante baad                            50%\nFIFO          4 din          48 ghante baad                             0%\n\n→ Video: \"DLQ mein koi data kabhi nahi khota\". DLQ ki bhi retention hai (1 minute se 14 din). Standard queue mein source jitni\n  retention (4 din) aur 2 din baad jaanch: in maanyataon par 33% messages pehle hi mit gaye. FIFO queue mein samay\n  DLQ mein dobara shuru hota hai. AWS docs: DLQ ki retention source se lambi rakho; DLQ ki depth aur umar par alert lagao.\n\nB. Arithmetic: availability ≈ MTBF ÷ (MTBF + MTTR)  (MTBF = do girawaton ke beech ausat samay, MTTR = theek hone ka samay)\n\nsaal mein ek baar gira, 24 ghante mein theek       99.72678%   saal mein band:   1436.1 min\nroz gira, 100 ms mein khud theek                   99.99988%   saal mein band:      0.6 min\nmahine mein ek baar, 1 ghanta                      99.86130%   saal mein band:    729.0 min\nhafte mein ek baar, 5 minute                       99.95042%   saal mein band:    260.6 min\n\n→ Video ka hisaab sahi: roz 100 ms ki girawat saal ke 24 ghante se bahut behtar. Par dono (MTBF aur MTTR) ginti mein hain;\n  aur \"100 ms mein khud theek\" tabhi jab girawat chhoti aur alag-alag ho — retries ka loop (ex0) MTTR ko ghanton tak le jaata hai."
        }
      ],
      "observe": {
        "q": "ex4: DLQ retention 14 din par 48 ghante baad dekhne se 0% gaye, par 300 ghante baad 50%. Kyun?",
        "choices": [
          "Retention pehle bheje samay se; der se fail hue ka samay beet chuka",
          "14 din ki retention mein SQS aadhe messages apne aap delete karta hai",
          "300 ghante baad DLQ bhar jaata hai, isliye naye messages phenke jaate"
        ],
        "answer": 0,
        "hint": "Message 72 ghante par DLQ mein gaya, aur 300 ghante baad dekha. 72 + 300 = ?",
        "explain": "Pehle bheje samay se ginti: 72 + 300 = 372 ghante > 336 (14 din). Jo messages 36 ghante ke baad fail hue, dekhne se pehle mit gaye — aadhe. Alert lagao taaki koi jaldi dekhe.",
        "choiceExplanations": [
          "Pehle bheje samay se ginti: 72 + 300 = 372 ghante > 336 (14 din). Jo messages 36 ghante ke baad fail hue, dekhne se pehle mit gaye — aadhe. Alert lagao taaki koi jaldi dekhe.",
          "SQS retention ke andar messages nahi mitata.",
          "Model mein DLQ ka size seemit nahi; samay ki baat hai."
        ]
      },
      "lesson": "Timeouts + deadline propagation + cancel maanna zombie kaam rokte hain. DLQ ko retention aur alert ke saath chalao."
    }
  ],
  "interview": {
    "title": "Interview Round — samay aur girawat",
    "instructions": "Pehle socho: user kab tak ruka hai, aur neeche wali service ko kaise pata chalega? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Search API: user 2 s wait karta hai. Ranking service kabhi 15 s leti hai; ranking ke CPU par aadha kaam un requests ka hai jinke users ja chuke. Fix?",
        "choices": [
          "Deadline propagation: ranking ko bacha samay bhejo, samay khatam toh ruko",
          "Ranking service ke servers dugne karo, taaki 15 s wali requests jaldi hon",
          "API ka timeout 2 s se 20 s karo, taaki ranking ka kaam bekaar na jaaye",
          "Ranking ke retries badha do, taaki dheemi request doosre server par jaaye"
        ],
        "answer": 0,
        "explain": "Aadha CPU zombie kaam par — user ja chuka, ranking ko pata nahi. Deadline aage bhejo (gRPC deadline / header), ranking deadline dekh kar ruke (cancel maane). Lab 62 ex2: deadline + cancel se bekaar kaam ~128 s se 0; bina cancel ke utna hi.",
        "choiceExplanations": [
          "Aadha CPU zombie kaam par — user ja chuka, ranking ko pata nahi. Deadline aage bhejo (gRPC deadline / header), ranking deadline dekh kar ruke (cancel maane). Lab 62 ex2: deadline + cancel se bekaar kaam ~128 s se 0; bina cancel ke utna hi.",
          "Zyada servers worker ko nahi batate ki request ka samay khatam; cancel aage bhejo aur maano.",
          "User 2 s par ja chuka; lamba timeout sirf thread pakadta hai.",
          "Zyada retries = zyada zombie kaam."
        ]
      },
      {
        "q": "Orders queue ki DLQ par alert nahi hai; retention 4 din (source jitni). Bug theek hone mein 5 din lage. Kya hua hoga, aur aage ke liye?",
        "choices": [
          "Kai orders DLQ se bhi expire; DLQ retention lambi (14 din) + depth alert",
          "Kuch nahi — DLQ mein messages hamesha surakshit rehte hain",
          "Saare orders source queue mein wapas aa gaye, retention ke baad",
          "DLQ ka size badhao — size kam hone se orders gaye"
        ],
        "answer": 0,
        "explain": "DLQ ki retention bhi khatam hoti hai, pehle bheje samay se (standard queue). 5 din > 4 din: kai orders gaye. DLQ retention max (14 din) aur depth/age par alert. Lab 62 ex4.",
        "choiceExplanations": [
          "DLQ ki retention bhi khatam hoti hai, pehle bheje samay se (standard queue). 5 din > 4 din: kai orders gaye. DLQ retention max (14 din) aur depth/age par alert. Lab 62 ex4.",
          "Video ka \"koi data nahi khota\" retention ke andar hi sach.",
          "Expire hue messages kahin wapas nahi jaate.",
          "SQS mein size nahi, samay (retention) se messages mit'te hain."
        ]
      }
    ]
  },
  "success": [
    "Timeout aur deadline propagation ka farq bata sakte ho",
    "Retries ko deadline mein fit kar sakte ho",
    "DLQ retention, MTTR aur breaker ke kinaare bata sakte ho"
  ],
  "cards": [
    {
      "front": "Timeout vs deadline?",
      "back": "Timeout caller ko bachata hai; neeche wala kaam karta rehta (zombie). Deadline aage bhejo aur neeche wala cancel maane: lab 62 ex2 mein bekaar kaam ~128 s se 0 (bina cancel ~128 s hi)."
    },
    {
      "front": "DLQ mein data surakshit?",
      "back": "Retention tak hi, pehle bheje samay se (SQS standard). DLQ retention lambi (max 14 din) + depth alert. Lab ex4 (barabar faile failures maan kar): 4 din par 2 din baad dekhna = 33% gaye."
    },
    {
      "front": "MTBF vs MTTR?",
      "back": "Availability ≈ MTBF ÷ (MTBF + MTTR). 24 h/saal → 99.73%; 100 ms/din → 99.9999%. Retry loop MTTR badhata hai."
    }
  ]
}
]);
})();
