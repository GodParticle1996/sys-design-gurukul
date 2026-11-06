/* Playlist · EDA Core topic 2: event payloads. Source credit: Software Developer Diaries,
   A Beginner's Guide to Event-Driven Architecture (RojKJnF_WWQ); Martin Fowler, "What do you mean by Event-Driven?".
   Numbers: docker-labs/47-event-payloads/captures; source code byte-checked. */
(function () {
const HERO = [{"id": "owner", "icon": "🧾", "label": "order-service", "x": 140, "y": 105}, {"id": "line", "icon": "📦", "label": "data wali khabar", "x": 445, "y": 105}, {"id": "copy", "icon": "📒", "label": "apni copy", "x": 750, "y": 105}];
const EDGES = [{"from": "owner", "to": "line"}, {"from": "line", "to": "copy"}];
VISUALS["ep-kaise"] = { t: "Data khabar ke saath aaya, consumer ne apni copy rakhi. Ab copy sahi kaise rahe?", html: SD.viz.svg(HERO, EDGES, { nodes: { owner: {tone:'ok',badge:'band bhi ho sakta'}, line: {tone:'acc',badge:'state + version'}, copy: {tone:'ok',badge:'version jaancho'} } }, {w:890,h:215}) };
SD.registerLevels('sdd-eda', [
{
  "id": "ep-kaise",
  "icon": "📒",
  "group": "📦 Event Payloads",
  "title": "Payload 2 · Kaise — data saath bhejo, copy ko sahi rakho",
  "badge": "Diary Rakhwala",
  "objectives": [
    "Moti khabar se consumer owner ke bina kaise chalta hai?",
    "Ulte kram aur duplicate khabar copy ko kaise bigaadti hai?",
    "Version check kya rokta hai?",
    "Sirf badlaav wali khabar mein ek khabar khoye toh kya karein?"
  ],
  "lesson": [
    "<h3>📒 Parchi ki copy saath bhejo</h3><p>Munshi ab ghanti ke saath parchi ki copy bhi deta hai. Helper apni diary mein likh lete hain, aur munshi chhutti par ho tab bhi kaam chalta hai.</p><p>Par diary ko sahi kaise rakhein jab parchiyan ulte kram mein aayein? Pehle dekho.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "📦 Moti khabar: data saath, copy apni",
      "goal": "Order #42, pehle trace ka fixed clock — bas khabar mein ab poora order hai. Neeche ka trace lab 47 ke tools/slowmo.js --mode fat ka fixed-clock run hai; saare ms lab ke tay kiye hue hain.",
      "nodes": [
        {
          "id": "owner",
          "icon": "🧾",
          "label": "order-service",
          "x": 150,
          "y": 90
        },
        {
          "id": "bus",
          "icon": "📬",
          "label": "broker",
          "x": 445,
          "y": 90
        },
        {
          "id": "delivery",
          "icon": "🛵",
          "label": "delivery",
          "x": 150,
          "y": 250
        },
        {
          "id": "notify",
          "icon": "📨",
          "label": "notify",
          "x": 445,
          "y": 250
        },
        {
          "id": "kitchen",
          "icon": "🍳",
          "label": "kitchen",
          "x": 740,
          "y": 250
        }
      ],
      "edges": [
        {
          "from": "owner",
          "to": "bus"
        },
        {
          "from": "bus",
          "to": "delivery"
        },
        {
          "from": "bus",
          "to": "notify"
        },
        {
          "from": "bus",
          "to": "kitchen"
        }
      ],
      "viz": {
        "w": 890,
        "h": 350,
        "focus": [
          "bus",
          "delivery"
        ]
      },
      "vars": [
        {
          "id": "ver",
          "label": "Owner ke paas order #42"
        },
        {
          "id": "reads",
          "label": "Owner par reads"
        },
        {
          "id": "pending",
          "label": "Line mein (delivery / notify / kitchen)"
        },
        {
          "id": "copy",
          "label": "Delivery ki copy"
        }
      ],
      "steps": [
        {
          "title": "Order #42 save hua (v1)",
          "clock": "0 ms",
          "say": "Wahi shuruaat: pata 12 Neem Road, thali dal-roti, version 1.",
          "nodes": {
            "owner": {
              "tone": "ok",
              "badge": "v1 save"
            },
            "bus": {
              "tone": "idle",
              "badge": "khaali"
            },
            "delivery": {
              "tone": "idle",
              "badge": "copy khaali"
            },
            "notify": {
              "tone": "idle",
              "badge": "copy khaali"
            },
            "kitchen": {
              "tone": "idle",
              "badge": "copy khaali"
            }
          },
          "vars": {
            "ver": "v1 · 12 Neem Road",
            "reads": "0",
            "pending": "0 / 0 / 0",
            "copy": "—"
          }
        },
        {
          "title": "Moti khabar gayi",
          "clock": "10 ms",
          "say": "Is baar khabar mein poora order hai: <code>{id: 42, version: 1, state: {pata, phone, thali}}</code>. Teen copies line mein.",
          "nodes": {
            "owner": {
              "tone": "ok",
              "badge": "v1"
            },
            "bus": {
              "tone": "busy",
              "badge": "3 copies"
            },
            "delivery": {
              "tone": "slow",
              "badge": "1 baaki"
            },
            "notify": {
              "tone": "slow",
              "badge": "1 baaki"
            },
            "kitchen": {
              "tone": "slow",
              "badge": "1 baaki"
            }
          },
          "vars": {
            "ver": "v1 · 12 Neem Road",
            "reads": "0",
            "pending": "1 / 1 / 1",
            "copy": "—"
          },
          "flows": [
            {
              "from": "owner",
              "to": "bus",
              "label": "v1 + poora order",
              "tone": "acc"
            }
          ]
        },
        {
          "title": "Asha ne order badla (v2)",
          "clock": "20 ms",
          "say": "Consumers ke uthane se pehle pata 99 Mango Lane aur thali idli ho gayi. Owner v2 par.",
          "nodes": {
            "owner": {
              "tone": "ok",
              "badge": "v2 save"
            },
            "bus": {
              "tone": "busy",
              "badge": "3 copies"
            },
            "delivery": {
              "tone": "slow",
              "badge": "1 baaki"
            },
            "notify": {
              "tone": "slow",
              "badge": "1 baaki"
            },
            "kitchen": {
              "tone": "slow",
              "badge": "1 baaki"
            }
          },
          "vars": {
            "ver": "v2 · 99 Mango Lane",
            "reads": "0",
            "pending": "1 / 1 / 1",
            "copy": "—"
          }
        },
        {
          "title": "v2 ki moti khabar bhi line mein",
          "clock": "30 ms",
          "say": "Har line mein do khabrein: v1 aur v2, dono apne-apne waqt ka poora order liye hue.",
          "nodes": {
            "owner": {
              "tone": "ok",
              "badge": "v2"
            },
            "bus": {
              "tone": "busy",
              "badge": "6 copies"
            },
            "delivery": {
              "tone": "slow",
              "badge": "2 baaki"
            },
            "notify": {
              "tone": "slow",
              "badge": "2 baaki"
            },
            "kitchen": {
              "tone": "slow",
              "badge": "2 baaki"
            }
          },
          "vars": {
            "ver": "v2 · 99 Mango Lane",
            "reads": "0",
            "pending": "2 / 2 / 2",
            "copy": "—"
          },
          "flows": [
            {
              "from": "owner",
              "to": "bus",
              "label": "v2 + poora order",
              "tone": "acc"
            }
          ],
          "ask": {
            "q": "Delivery ab v1 wali moti khabar uthayegi. Delivery ki copy mein kaunsa pata aayega?",
            "choices": [
              "12 Neem Road — khabar mein v1 ke waqt ka poora order likha hai",
              "99 Mango Lane — consumer pehle owner se taaza pata maang leta hai",
              "Koi pata nahi — v2 aa chuka hai, toh broker v1 ki khabar mita deta hai"
            ],
            "answer": 0,
            "hint": "Data kahan se aa raha hai: khabar se, ya owner se?",
            "explain": "Moti khabar ka data khabar bante waqt ka hai. v1 ki khabar mein 12 Neem Road likha hai, toh copy mein 12 Neem Road aayega — owner ko call nahi.",
            "choiceExplanations": [
              "Moti khabar ka data khabar bante waqt ka hai. v1 ki khabar mein 12 Neem Road likha hai, toh copy mein 12 Neem Road aayega — owner ko call nahi.",
              "Moti khabar par consumer owner ko call nahi karta. Data khabar ke andar hai.",
              "Broker purani khabar nahi mitata. Har khabar apni baari se consumer tak jaati hai."
            ]
          }
        },
        {
          "title": "Delivery ne v1 khabar se copy banayi",
          "clock": "100 ms",
          "say": "Delivery ne khabar ka order apni copy mein rakha: 12 Neem Road, version 1. Owner par ek bhi read nahi.",
          "nodes": {
            "owner": {
              "tone": "idle",
              "badge": "reads 0"
            },
            "bus": {
              "tone": "busy",
              "badge": "5 copies"
            },
            "delivery": {
              "tone": "ok",
              "badge": "copy v1"
            },
            "notify": {
              "tone": "slow",
              "badge": "2 baaki"
            },
            "kitchen": {
              "tone": "slow",
              "badge": "2 baaki"
            }
          },
          "vars": {
            "ver": "v2 · 99 Mango Lane",
            "reads": "0",
            "pending": "1 / 2 / 2",
            "copy": "v1 · 12 Neem Road"
          }
        },
        {
          "title": "Notify aur kitchen ne bhi apni copy banayi",
          "clock": "120 ms",
          "say": "Teeno ki copy ab v1 par hai. Owner ko kisi ne call nahi kiya. Line mein v2 ki teen khabrein baaki.",
          "nodes": {
            "owner": {
              "tone": "idle",
              "badge": "reads 0"
            },
            "bus": {
              "tone": "busy",
              "badge": "3 copies"
            },
            "delivery": {
              "tone": "ok",
              "badge": "copy v1"
            },
            "notify": {
              "tone": "ok",
              "badge": "copy v1"
            },
            "kitchen": {
              "tone": "ok",
              "badge": "copy v1"
            }
          },
          "vars": {
            "ver": "v2 · 99 Mango Lane",
            "reads": "0",
            "pending": "1 / 1 / 1",
            "copy": "v1 · 12 Neem Road"
          },
          "ask": {
            "q": "Socho delivery ko v2 ki khabar v1 se pehle milti, aur delivery har khabar seedha copy par likh deti. Aakhir mein copy mein kya bachta?",
            "choices": [
              "12 Neem Road — baad mein aayi purani v1 khabar naye pate ke upar likh jaati",
              "99 Mango Lane — copy hamesha sabse naye version wala pata hi rakhti hai",
              "Copy khaali ho jaati — ulte kram mein aayi khabar copy mita deti hai"
            ],
            "answer": 0,
            "hint": "Bina jaanch ke likhne wali copy mein kaun jeet-ta hai: naya version ya aakhri pahunchi khabar?",
            "explain": "Bina version jaanche, aakhri pahunchi khabar jeet-ti hai. v1 baad mein aaye toh purana pata wapas aa jaata hai. Lab mein purani v1 ne v2 ko overwrite kiya: v2, v1, v1 ke kram mein 12 mein se 12 copies galat bachi.",
            "choiceExplanations": [
              "Bina version jaanche, aakhri pahunchi khabar jeet-ti hai. v1 baad mein aaye toh purana pata wapas aa jaata hai. Lab mein purani v1 ne v2 ko overwrite kiya: v2, v1, v1 ke kram mein 12 mein se 12 copies galat bachi.",
              "Copy ko kaise pata ki kaunsa naya hai? Version check na ho toh aakhri likhi khabar hi bachti hai.",
              "Khabar copy ko mitati nahi, apna data likh deti hai. Dikkat purana data likh jaana hai."
            ]
          }
        },
        {
          "title": "v2 ki khabrein — copies naye order par",
          "clock": "220 ms",
          "say": "Teeno ne v2 khabar se copy badli: 99 Mango Lane, version 2. Poore run mein owner par 0 reads. Delivery ne pehle purana, phir naya pata dekha.",
          "nodes": {
            "owner": {
              "tone": "idle",
              "badge": "reads 0"
            },
            "bus": {
              "tone": "ok",
              "badge": "0 copies"
            },
            "delivery": {
              "tone": "ok",
              "badge": "copy v2"
            },
            "notify": {
              "tone": "ok",
              "badge": "copy v2"
            },
            "kitchen": {
              "tone": "ok",
              "badge": "copy v2"
            }
          },
          "vars": {
            "ver": "v2 · 99 Mango Lane",
            "reads": "0",
            "pending": "0 / 0 / 0",
            "copy": "v2 · 99 Mango Lane"
          }
        }
      ],
      "lesson": "Moti khabar mein kaam ka data saath jaata hai: owner par 0 reads, aur owner band ho tab bhi kaam chalta hai. Consumer ki copy khabar ke waqt ka data rakhti hai. Khabrein ulte kram ya do baar aa sakti hain, isliye copy par likhne se pehle version jaanchna zaroori hai."
    },
    {
      "type": "cards",
      "title": "📒 Helper ki diary — copy rakhi, ab sahi kaise rakhein?",
      "lesson": "Copy par likhne se pehle version jaancho: purani aur duplicate khabar ruk jaati hai. Sirf badlaav bhejo toh gap pakdo aur owner se resync karo.",
      "goal": "Parchi ki copy se kaam chal gaya. Ab do nayi dikkatein: parchi ulte kram mein aaye, ya ek parchi kho jaaye.",
      "steps": [
        {
          "title": "1. Purani parchi baad mein aayi",
          "say": "Delivery wala apni diary mein Asha ka pata likhta hai. Pehle parchi #1: \"12 Neem Road\". Phir Asha ne pata badla, parchi #2: \"7 Peepal Gali\". Raaste ki bheed mein #2 pehle pahunchi, #1 baad mein.",
          "ask": {
            "q": "Delivery wala har aane wali parchi diary mein seedha likh deta hai. Aakhir mein diary mein kaunsa pata hoga?",
            "choices": [
              "12 Neem Road — baad mein pahunchi purani parchi ne naya pata mita diya",
              "7 Peepal Gali — diary mein hamesha sabse naya pata hi bachta hai",
              "Dono pate — diary har parchi ka pata alag line mein jodti rehti hai"
            ],
            "answer": 0,
            "hint": "Diary mein aakhri likhi parchi kaunsi thi?",
            "explain": "Seedha likhne wali diary mein aakhri pahunchi parchi ka pata bachta hai. #1 baad mein pahunchi, toh purana pata naye pate ke upar likh gaya.",
            "choiceExplanations": [
              "Seedha likhne wali diary mein aakhri pahunchi parchi ka pata bachta hai. #1 baad mein pahunchi, toh purana pata naye pate ke upar likh gaya.",
              "Diary ko kaise pata ki kaunsa naya hai? Parchi par koi number nahi, toh aakhri pahunchi parchi jeet-ti hai.",
              "Is diary mein har order ka ek hi pata rehta hai; nayi parchi purane pate ko badal deti hai."
            ]
          }
        },
        {
          "title": "2. Parchi par number likho",
          "say": "Munshi har badlaav par parchi par number badhata hai: #1, #2, #3. Delivery wala diary mein number bhi likhta hai. Nayi parchi ka number diary wale number se bada na ho toh parchi chhod deta hai.",
          "ask": {
            "q": "Diary mein #2 likha hai. Ab #1 aur phir #2 ki doosri copy aati hai. Kya hoga?",
            "choices": [
              "Dono chhod di jaayengi — dono ka number diary ke #2 se bada nahi",
              "#1 likhi jaayegi, kyunki purani parchi pehle likhni chahiye",
              "Doosri #2 likhi jaayegi, aur #1 chhod di jaayegi"
            ],
            "answer": 0,
            "hint": "Niyam: number diary wale number se bada ho, tabhi likho.",
            "explain": "#1 purani hai aur #2 ki copy duplicate hai. Dono ka number diary ke #2 se bada nahi, toh dono chhod di jaati hain. Diary sahi pate par tiki rehti hai.",
            "choiceExplanations": [
              "#1 purani hai aur #2 ki copy duplicate hai. Dono ka number diary ke #2 se bada nahi, toh dono chhod di jaati hain. Diary sahi pate par tiki rehti hai.",
              "Number ka niyam purani parchi ko rokta hai. #1 likhte toh naya pata phir mit jaata.",
              "#2 pehle hi likha hai. Wahi parchi dobara likhne se kuch nahi badalta, isliye chhod dete hain."
            ]
          }
        },
        {
          "title": "3. Sirf badlaav bhejo — par ek parchi kho gayi",
          "say": "Poori parchi bhaari hai, toh munshi ab sirf badlaav bhejta hai: \"#3: phone badla\". Diary mein #1 hai. #2 raaste mein kho gaya, #3 aa gaya. Diary #1 + #3 jodegi, aur #2 ka badlaav (pata) chhoot jaayega.",
          "ask": {
            "q": "Diary ko kaise pata chale ki beech ki parchi khoi?",
            "choices": [
              "Diary mein #1 hai aur #3 aayi — #2 gayab hai, toh munshi se poori parchi maango",
              "#3 ka phone sahi hai, toh poori diary sahi hai — kuch karne ki zaroorat nahi",
              "Har parchi aate hi munshi se poori parchi maango, chahe number kuch bhi ho"
            ],
            "answer": 0,
            "hint": "Agla number #2 hona chahiye tha.",
            "explain": "Is run mein #2 ne pata badla aur #3 ne sirf phone. #2 chhoota toh #3 lagane se pata theek nahi hota. #1 ke baad #3 ka gap dikhe toh munshi se poori parchi lo (resync), phir aage badho.",
            "choiceExplanations": [
              "Is run mein #2 ne pata badla aur #3 ne sirf phone. #2 chhoota toh #3 lagane se pata theek nahi hota. #1 ke baad #3 ka gap dikhe toh munshi se poori parchi lo (resync), phir aage badho.",
              "#3 mein sirf phone hai. #2 ka badla pata diary mein kabhi nahi aayega — galti chupchaap rahegi.",
              "Har baar munshi ke paas jaana patle event ki callback reads ka bojh hai. Sirf gap dikhne par jaana kaafi hai."
            ]
          }
        },
        {
          "title": "4. Technical naam",
          "say": "Diary = consumer ki <b>local copy</b> (read model). Parchi ka number = <b>version</b>: is order ke badlaav ka number. Is lab mein har badlaav par number theek 1 badhta hai (1, 2, 3), aur har consumer ko har order ke saare badlaav milte hain. Purani ya duplicate parchi chhodna = <b>version check</b> (stale aur duplicate dono rukte hain). Sirf badlaav wali parchi = <b>delta event</b>. Gap dikhne par owner se poori copy lana = <b>resync</b>."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Ulta kram, duplicate aur khoya badlaav — asli HTTP par",
      "project": "47-event-payloads",
      "exercise": "ex4-order-duplicates",
      "goal": "Pehle har order ki khabrein v2, v1, v1 ke kram mein (version check band aur chalu). Phir delta: v2 ka badlaav raaste mein gira.",
      "why": "Node 18+ chahiye. Har tool apne paanch processes khud chalata aur band karta hai. Neeche ka output lab 47 ke captured HTTP runs se hai (--brief); teeno runs byte-identical. Docker compose chalaya nahi gaya.",
      "steps": [
        {
          "text": "Lab folder se: khabrein ulte kram aur duplicate ke saath, version check ke bina aur ke saath.",
          "cmd": "cd docker-labs/47-event-payloads && npm start -- ex4-order-duplicates --brief",
          "expect": "HTTP between child processes\nguard=false orders=4 consumers=3 deliveryVersionsPerOrder=2,1,1 wrongFinalCopies=12 completed=36 ignored=0\nguard=true orders=4 consumers=3 deliveryVersionsPerOrder=2,1,1 wrongFinalCopies=0 completed=12 ignored=24"
        },
        {
          "text": "Sirf badlaav wali khabrein; v2 (pata badla) gira, v3 (phone badla) pahuncha.",
          "cmd": "npm start -- ex5-delta --brief",
          "expect": "HTTP between child processes\nguard=false deliveredVersions=1,3 droppedVersion=2 wrongFinalCopies=3 reads=0\nguard=true deliveredVersions=1,3 droppedVersion=2 wrongFinalCopies=0 reads=3"
        }
      ],
      "observe": {
        "q": "Version check chalu: wrongFinalCopies=0, ignored=24. 24 ignored khabrein kis delivery sequence se aayi?",
        "choices": [
          "Har copy par v2 ke baad aayi v1 aur v1 ka duplicate: 4 orders × 3 consumers × 2",
          "Broker ne 24 khabrein raaste mein gira di, aur consumer ne gayab khabrein ignored gini",
          "v2 ki khabrein, kyunki copy mein pehle se v2 tha aur v2 ko bhi chhodna padta hai"
        ],
        "answer": 0,
        "hint": "deliveryVersionsPerOrder=2,1,1 — v2 ke baad kaunsi khabrein copy ke version se badi nahi?",
        "explain": "Har order ki khabrein v2, v1, v1 aayi. v2 copy mein likha gaya; v2 ke baad aayi v1 aur duplicate v1 dono copy ke v2 se chhoti hain, toh chhod di gayi. 4 orders × 3 consumers × 2 = 24. Bina check ke purani v1 copy par likh gayi aur 12 copies galat bachi.",
        "choiceExplanations": [
          "Har order ki khabrein v2, v1, v1 aayi. v2 copy mein likha gaya; v2 ke baad aayi v1 aur duplicate v1 dono copy ke v2 se chhoti hain, toh chhod di gayi. 4 orders × 3 consumers × 2 = 24. Bina check ke purani v1 copy par likh gayi aur 12 copies galat bachi.",
          "Broker ne kuch nahi giraya: deliveryVersionsPerOrder=2,1,1, har khabar pahunchi. Ignore consumer ka faisla tha.",
          "v2 ki 12 deliveries copy par likhi gayi; completed=12 in 12 deliveries ki ginti hai. Chhodi gayi khabrein v2 ke baad wali purani v1 thi."
        ]
      },
      "lesson": "Version check purani aur duplicate dono khabron ko rokta hai. Delta mein bina check ke ek khoya badlaav copy ko chupchaap galat chhodta hai (3 galat copies); gap dekh ke resync karne par har consumer ki ek read, aur 0 galat copies."
    }
  ],
  "interview": {
    "title": "Interview Round — copy ko sahi rakhna",
    "instructions": "Event kis kram mein aaye, kitni baar aaye, socho. Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Delivery ki copy v3 par hai. Ab v2 ki purani moti khabar dobara aati hai. Version check band hai. Copy ka kya hoga?",
        "choices": [
          "v2 ka purana pata v3 ke naye pate ke upar likh jaayega; copy wapas v2 par",
          "Copy v3 par rahegi, kyunki duplicate apne aap pehchaan liya jaata hai",
          "Copy v4 ban jaayegi, kyunki har delivery copy ka version badhaati hai",
          "Owner ko call karke v3 ka pata dobara le liya jaayega, taaki copy sahi rahe"
        ],
        "answer": 0,
        "explain": "Bina version check ke consumer har moti khabar ka order copy par likh deta hai. Purana v2 dobara aaya toh copy v2 par laut gayi. Version check hota toh 2 ≤ 3 par khabar chhod di jaati.",
        "choiceExplanations": [
          "Bina version check ke consumer har moti khabar ka order copy par likh deta hai. Purana v2 dobara aaya toh copy v2 par laut gayi. Version check hota toh 2 ≤ 3 par khabar chhod di jaati.",
          "Duplicate ko rokne ke liye version check chahiye. Sawaal mein version check band hai.",
          "Version owner ke badlaav ka number hai. Consumer delivery ki ginti se version nahi badhaata.",
          "Moti khabar wala raasta khabar ka order leta hai; owner ko call nahi karta."
        ]
      },
      {
        "q": "Aap delta events (sirf badle fields) bhejna chahte ho. Consumer mein kam se kam kya hona zaroori hai?",
        "choices": [
          "Shuruaati poori copy, har event ka version, aur gap dikhe toh owner se resync",
          "Bas badle fields jod do — delta mein kuch chhootne ka koi khatra nahi hota",
          "Har delta par owner se poora state bhi maango, taaki delta galat na ho",
          "Delta ko broker mein hamesha ke liye rakho, taaki consumer kabhi bhi padh sake"
        ],
        "answer": 0,
        "explain": "Delta purani copy par lagta hai, toh shuruaati copy chahiye. Ek delta chhoota toh copy chupchaap galat hogi — version gap se pakdo aur resync karo. Broker ka retention madad karta hai, par gap check ki jagah nahi leta.",
        "choiceExplanations": [
          "Delta purani copy par lagta hai, toh shuruaati copy chahiye. Ek delta chhoota toh copy chupchaap galat hogi — version gap se pakdo aur resync karo. Broker ka retention madad karta hai, par gap check ki jagah nahi leta.",
          "Chhoote delta ka field baad ki khabar mein na ho toh copy galat reh sakti hai. Version gap aur resync galti pakadne aur copy sudhaarne ka raasta dete hain.",
          "Har baar owner se poora state maangna delta ka faayda khatam karke patle event wala bojh wapas laata hai.",
          "Lamba retention purane events dobara padhne deta hai, par consumer ko pata hona chahiye ki kuch chhoota."
        ]
      }
    ]
  },
  "success": [
    "Moti khabar se local copy banana aur owner par 0 reads ka matlab samjha sakte ho",
    "Version check se purani aur duplicate khabar rok sakte ho",
    "Delta mein gap pakad ke resync karne ka tareeka bata sakte ho"
  ],
  "cards": [
    {
      "front": "Event par version kyun?",
      "back": "Event ulte kram mein ya do baar aa sakta hai. Sirf bada version likho: purana aur duplicate dono rukte hain."
    },
    {
      "front": "Delta event ka khatra?",
      "back": "Ek delta chhoota toh copy chupchaap galat. Version gap dikhe toh owner se poori copy lo (resync)."
    },
    {
      "front": "Local copy ka kharcha?",
      "back": "Copy thodi purani ho sakti hai, har consumer ke paas data ki copy hai, aur kram/gap ka code likhna padta hai."
    }
  ]
}
]);
})();
