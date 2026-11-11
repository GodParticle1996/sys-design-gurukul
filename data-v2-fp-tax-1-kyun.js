/* First Principles — FAANG Senior Engineer.
   Source credit: The Taxonomy of Storage (mhpinZnH7xI), numbered video 6/15.
   Evidence: docker-labs/56-storage-taxonomy/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "app", "icon": "🧾", "label": "KhanaKart app", "x": 130, "y": 145}, {"id": "docs", "icon": "📄", "label": "6 documents (copies)", "x": 520, "y": 70}, {"id": "row", "icon": "🏠", "label": "addresses (ek row)", "x": 520, "y": 220}];
const EDGES = [{"from": "app", "to": "docs"}, {"from": "app", "to": "row"}];
VISUALS["fp-tax-kyun"] = { t: "Address 6 jagah copy tha. App ne 3 badle, phir crash. Courier purane ghar gaya.", html: SD.viz.svg(HERO, EDGES, { nodes: { app: {tone:'bad',badge:'crash'}, docs: {tone:'busy',badge:'3 + 3'}, row: {tone:'ok',badge:'1 row'} } }, {w:890,h:290}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-tax-kyun",
  "icon": "🗂️",
  "group": "🗂️ Taxonomy of Storage",
  "title": "Taxonomy 1 · Kyun — ek address, chhe copies",
  "badge": "Access Pattern Pehchaanne Wala",
  "objectives": [
    "Data ki copies banaane ka faayda aur kharcha kya hai?",
    "Ek hi data teen shapes mein: kaunsa sawaal kis shape par tez?",
    "Database ka naam nahi, sawaal dekh ke shape kyun chunna?"
  ],
  "lesson": [
    "<h3>📒 Rishtedaaron ki diaries</h3><p>Asha ki maa har rishtedaar ki diary mein Asha ka address likh deti hai — kisi ko phone nahi karna padta. Phir Asha shift hui. Maa ne teen diaries badli, phir bhool gayi. Ab teen rishtedaar purane ghar par mithai bhej rahe hain.</p><p>Database mein ek fact ki kai copies ho toh kuch copies purani reh sakti hain. Aaj naapte hain: copy kab tez hai, kab mehngi, aur shape kaise chunna hai.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "🏠 Asha ne ghar badla — courier kahan gaya?",
      "goal": "Lab 56 ex0 ka model. Asha (user 42) Pune 411004 se 411038 shift hui. Document shape mein Asha ka address 6 jagah copy hai: profile + 5 pending deliveries. Lab ka business niyam: Asha ne pending deliveries ka destination bhi naye ghar par badalne ko kaha hai. Relational shape mein address ek row hai.",
      "nodes": [
        {
          "id": "app",
          "icon": "🧾",
          "label": "KhanaKart app",
          "x": 130,
          "y": 145
        },
        {
          "id": "docs",
          "icon": "📄",
          "label": "6 documents (copies)",
          "x": 520,
          "y": 70
        },
        {
          "id": "row",
          "icon": "🏠",
          "label": "addresses (ek row)",
          "x": 520,
          "y": 220
        }
      ],
      "edges": [
        {
          "from": "app",
          "to": "docs"
        },
        {
          "from": "app",
          "to": "row"
        }
      ],
      "viz": {
        "w": 890,
        "h": 290
      },
      "vars": [
        {
          "id": "new",
          "label": "Naya address (411038)"
        },
        {
          "id": "old",
          "label": "Purana (411004)"
        },
        {
          "id": "truth",
          "label": "Sach kaunsa?"
        }
      ],
      "steps": [
        {
          "title": "6 copies",
          "clock": "shuru",
          "say": "Profile page tez chahiye tha, toh team ne Asha ka address profile document aur har pending order document mein copy kar diya. Padhte waqt koi join nahi.",
          "nodes": {
            "app": {
              "tone": "idle",
              "badge": "app"
            },
            "docs": {
              "tone": "busy",
              "badge": "6 × 411004"
            },
            "row": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "new": "0",
            "old": "6",
            "truth": "sab ek jaisa"
          },
          "ask": {
            "q": "Asha ghar badalti hai. Document shape mein app ko kitne writes karne padenge?",
            "choices": [
              "6 — har copy alag document mein hai; har copy dhoondh ke badalni padegi",
              "1 — database copies ko aapas mein jod ke rakhta hai, ek badlo toh sab badle",
              "5 — sirf order documents; profile document khud order documents se padhta hai"
            ],
            "answer": 0,
            "hint": "Address kitni jagah likha hai?",
            "explain": "Copy ka matlab hai address 6 alag documents mein alag-alag likha hai. Database ko pata hi nahi ki 6 copies ek hi fact hain. Har copy badalne ka zimma app ka hai.",
            "choiceExplanations": [
              "Copy ka matlab hai address 6 alag documents mein alag-alag likha hai. Database ko pata hi nahi ki 6 copies ek hi fact hain. Har copy badalne ka zimma app ka hai.",
              "Document store copies ko aapas mein nahi jodta; har document akela hai.",
              "Profile document mein apni copy hai; profile order documents se nahi padhta."
            ]
          }
        },
        {
          "title": "3 likhe",
          "clock": "3 writes",
          "say": "App ek-ek karke likhta hai: profile → 411038, order #1 → 411038, order #2 → 411038.",
          "nodes": {
            "app": {
              "tone": "acc",
              "badge": "likh raha"
            },
            "docs": {
              "tone": "busy",
              "badge": "3 naya, 3 baaki"
            },
            "row": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "new": "3",
            "old": "3",
            "truth": "?"
          },
          "flows": [
            {
              "from": "app",
              "to": "docs",
              "label": "rewrite",
              "tone": "acc"
            }
          ]
        },
        {
          "title": "💥 Crash",
          "clock": "crash",
          "say": "Order #3 likhne se pehle app crash. Koi transaction nahi tha.",
          "nodes": {
            "app": {
              "tone": "bad",
              "badge": "crash ✗"
            },
            "docs": {
              "tone": "bad",
              "badge": "3 naya, 3 purana"
            },
            "row": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "new": "3",
            "old": "3",
            "truth": "database ko pata nahi"
          },
          "ask": {
            "q": "Restart ke baad order #3, #4, #5 ka courier kahan jaayega?",
            "choices": [
              "Purane address 411004 par — database ke paas koi nishaan nahi ki naya sach hai",
              "Naye address par — database aakhri write ko baaki copies mein bhi phaila deta hai",
              "Kahin nahi — crash ke baad database sab writes wapas le leta hai, profile bhi purana"
            ],
            "answer": 0,
            "hint": "Crash ke baad database ko kaise pata chalega ki 6 copies ek hi address hain?",
            "explain": "Order #3, #4, #5 ke documents mein ab bhi 411004 hai. Database ki nazar mein 3 document naye, 3 purane — dono valid. Sach kaunsa hai, is baat ki jaankari sirf app ke dimaag mein thi, aur app crash ho gaya.",
            "choiceExplanations": [
              "Order #3, #4, #5 ke documents mein ab bhi 411004 hai. Database ki nazar mein 3 document naye, 3 purane — dono valid. Sach kaunsa hai, is baat ki jaankari sirf app ke dimaag mein thi, aur app crash ho gaya.",
              "Database copies ka rishta jaanta hi nahi, toh phailane ka sawaal nahi.",
              "Bina transaction har write apne aap pakka ho gaya; crash pehle ke 3 writes wapas nahi leta."
            ]
          }
        },
        {
          "title": "Relational",
          "clock": "1 write",
          "say": "Ab doosra shape: address <b>addresses</b> table ki ek row. Profile aur orders address ka id rakhte hain. Ek <code>UPDATE</code>: 411038.",
          "nodes": {
            "app": {
              "tone": "ok",
              "badge": "UPDATE"
            },
            "docs": {
              "tone": "idle",
              "badge": ""
            },
            "row": {
              "tone": "ok",
              "badge": "411038"
            }
          },
          "vars": {
            "new": "1 row",
            "old": "0",
            "truth": "ek hi row"
          },
          "flows": [
            {
              "from": "app",
              "to": "row",
              "label": "UPDATE",
              "tone": "ok"
            }
          ],
          "ask": {
            "q": "UPDATE ke turant baad app crash ho jaaye. Order #5 ka page kya dikhayega?",
            "choices": [
              "411038 — order sirf address ka id rakhta hai; join ek hi row padhta hai",
              "411004 — order ne address ki apni copy rakhi thi, order ki copy nahi badli",
              "Error — crash ke baad join adhoori row padhta hai aur fail ho jaata hai"
            ],
            "answer": 0,
            "hint": "Order ke paas address hai, ya address ka id?",
            "explain": "Relational shape mein ek fact ek jagah: address ek row. Orders address id se jude hain, toh har join addresses table ki ek hi row padhta hai. Ek write, aur kisi copy ko dhoondhna nahi.",
            "choiceExplanations": [
              "Relational shape mein ek fact ek jagah: address ek row. Orders address id se jude hain, toh har join addresses table ki ek hi row padhta hai. Ek write, aur kisi copy ko dhoondhna nahi.",
              "Relational shape mein order ke paas sirf id hai, copy nahi.",
              "UPDATE poora hua ya hua hi nahi; aadhi row nahi hoti."
            ]
          }
        },
        {
          "title": "Ilaaj",
          "clock": "ilaaj",
          "say": "Document shape mein do raaste: saare 6 writes <b>ek transaction</b> mein (sab ya kuch nahi), ya address <b>ek jagah</b> rakh ke padhte waqt lo. Order dete waqt chuna address aur issued invoice ka address itihaas hain — business niyam ke bina itihaas wali copy nahi badalti.",
          "nodes": {
            "app": {
              "tone": "ok",
              "badge": "BEGIN…COMMIT"
            },
            "docs": {
              "tone": "ok",
              "badge": "6 ya 0"
            },
            "row": {
              "tone": "ok",
              "badge": ""
            }
          },
          "vars": {
            "new": "6 ya 0",
            "old": "0 ya 6",
            "truth": "ek jaisa"
          }
        }
      ],
      "lesson": "Copy banaana padhna tez karta hai, par har copy badalne ka zimma app par aata hai. Ek fact ek jagah (normalization) ho toh ek write kaafi. Copies rakhni hain toh transaction se sab ya kuch nahi."
    },
    {
      "type": "cards",
      "title": "⏱️ Teen shapes, do sawaal",
      "goal": "Lab 56 ex1: 1 lakh users ka ek dataset teen shapes mein — tables (join), JSON documents, aur key-value (JS Map). Asli SQLite, asli query plans.",
      "lesson": "Jis sawaal ke liye shape bana, us par shape tez. Lab mein doosre sawaal ke liye document aur KV ke paas index nahi tha, toh sab padhna pada. Naya index ya lookup structure ban sakta hai — extra writes ki keemat par. Shape access pattern se chuno.",
      "steps": [
        {
          "title": "1. Ek user ka poora page",
          "say": "Q1: user 4242 + address + aakhri 5 orders, ek object ki shakal mein (teeno ka object same). Join (3 tables) + rows ko object mein jodna: <b>10.1–11.7 µs</b>. Ek JSON document: <b>2.7–3.3 µs</b>. Key-value: <b>1.1–1.4 µs</b>. Lab ka key-value baseline JS Map hai — network call nahi; asli Redis mein network ka safar judta.",
          "ask": {
            "q": "Document join se ~3–4× tez kyun?",
            "choices": [
              "Sab kuch ek row mein — ek lookup; join ko teen lookups aur rows jodne pade",
              "Document compress hota hai, isliye disk se kam bytes aate hain aur padhna tez",
              "Join ko har baar poori orders table padhni padi, document ko sirf ek row"
            ],
            "answer": 0,
            "hint": "Query plan mein join ke kitne SEARCH hain?",
            "explain": "Plan: join ke teen SEARCH (users, addresses, orders ka index), chhota sort, phir 5 rows ko ek object mein jodna. Document ka ek SEARCH aur ek parse. Dono microseconds mein, kyunki file RAM mein garam hai. Data saath rakhna (data locality) ek-do lookups bachata hai.",
            "choiceExplanations": [
              "Plan: join ke teen SEARCH (users, addresses, orders ka index), chhota sort, phir 5 rows ko ek object mein jodna. Document ka ek SEARCH aur ek parse. Dono microseconds mein, kyunki file RAM mein garam hai. Data saath rakhna (data locality) ek-do lookups bachata hai.",
              "Lab ka document plain JSON text hai, compressed nahi.",
              "Plan mein orders par SEARCH USING INDEX hai, poori table ka SCAN nahi."
            ]
          }
        },
        {
          "title": "2. Ab doosra sawaal",
          "say": "Q2: Pune ke kitne users ne biryani order ki? (sach: 6,171; teeno ka jawab same.) Index wala join: <b>11.2–12.2 ms</b>. JSON documents: <b>98–106 ms</b>. Key-value: <b>136–156 ms</b>.",
          "ask": {
            "q": "Ab document aur key-value 8–13× dheeme kyun?",
            "choices": [
              "Shape Q1 ke liye bana tha; Q2 ke liye har document aur har value padhni padi",
              "Pune ke users zyada hain, toh documents ko zyada RAM chahiye aur disk se aana pada",
              "SQL ne pichhle run ka jawab cache se diya; documents ko har baar naya ginna pada"
            ],
            "answer": 0,
            "hint": "Plan mein documents ke liye SEARCH hai ya SCAN?",
            "explain": "Relational ne city ka index aur orders ka index lagaya. Documents ka plan SCAN user_docs — har document kholo, andar orders dekho. Lab ka JS Map sirf user-id se laata hai, toh Q2 par sab padhna pada. Video ka query tax: matching lookup structure ke bina baaki values padhne ka kharcha. Document-field index ya secondary index se doosre sawaal bhi tez ho sakte hain, extra writes ki keemat par.",
            "choiceExplanations": [
              "Relational ne city ka index aur orders ka index lagaya. Documents ka plan SCAN user_docs — har document kholo, andar orders dekho. Lab ka JS Map sirf user-id se laata hai, toh Q2 par sab padhna pada. Video ka query tax: matching lookup structure ke bina baaki values padhne ka kharcha. Document-field index ya secondary index se doosre sawaal bhi tez ho sakte hain, extra writes ki keemat par.",
              "Sabhi shapes ek hi file mein, RAM mein garam; farq padhne ke tareeke ka hai.",
              "Har run naya ginta hai; lab mein query cache nahi."
            ]
          }
        },
        {
          "title": "3. Naam",
          "say": "Sawaal kaise poochhe jaayenge: <b>access pattern</b>. Ek fact ek jagah: <b>normalization</b>. Tezi ke liye copies: <b>denormalization</b>. Saath padhe jaane wala data saath rakhna: <b>data locality</b>. Code ke objects aur tables ka mel na baithna: <b>impedance mismatch</b>."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Ek row vs chhe copies, asli SQLite par",
      "project": "56-storage-taxonomy",
      "exercise": "ex1-shapes",
      "goal": "Pehle model (ex0), phir asli SQLite par teen shapes, teen sawaal aur 3 writes ke baad wala crash — transaction ke saath aur bina.",
      "why": "Node 24+ chahiye (SQLite Node ke andar hai). ex0 model hai, har run same. ex1 asli SQLite hai; samay machine ke saath badlega, ginti same.",
      "steps": [
        {
          "text": "Lab folder se: model.",
          "cmd": "cd docker-labs/56-storage-taxonomy && npm start -- ex0-slowmo",
          "expect": "== MODEL: relational — the address is one row; orders point at it by id ==\nstep 1  UPDATE addresses SET pincode = 411038 WHERE id = 42      → 1 row changed\nstep 2  profile page: users ⋈ addresses                          → 411038\n        order #5 page (still pending): orders ⋈ users ⋈ addresses  → 411038 (same row, read through the join)\n\n== MODEL: documents — the address is copied into 6 documents ==\nstep 1  rewrite profile   → 411038\nstep 2  rewrite order #1  → 411038\nstep 3  rewrite order #2  → 411038\nstep 4  💥 app crashes before rewriting order #3 (no transaction around the 6 writes)\n\nafter the crash, what each page shows:\n  profile   411038\n  order #1  411038\n  order #2  411038\n  order #3  411004   ← old address; a courier would go here\n  order #4  411004   ← old address; a courier would go here\n  order #5  411004   ← old address; a courier would go here\n3 documents say 411038, 3 say 411004. Nothing in the database says which is true.\n\nFixes: one transaction around all 6 writes (all or nothing), or keep the address in one place and look it up."
        },
        {
          "text": "Asli SQLite par teen shapes.",
          "cmd": "npm start -- ex1-shapes",
          "expect": "REAL RUN: Node v24.18.0, SQLite 3.53.1; 1,00,000 users, 5 orders each, one file\n\n== Q1: user 4242 with address and last 5 orders, as one object (median of 2,000 runs; all three return the same object) ==\nrelational: join + assemble    10.1 µs   plan: SEARCH u USING INTEGER PRIMARY KEY (rowid=?) │ SEARCH a USING INTEGER PRIMARY KEY (rowid=?) │ SEARCH o USING INDEX orders_user (user_id=?) │ USE TEMP B-TREE FOR ORDER BY\ndocument  : one JSON row         2.7 µs   plan: SEARCH user_docs USING INTEGER PRIMARY KEY (rowid=?)\nkey-value : Map get + parse      1.1 µs   (no database call at all)\n\n== Q2: how many Pune users ordered biryani? (median of 5 runs) ==\nanswer: 6,171 users (all three agree)\nrelational: indexed join         11.2 ms   plan: SEARCH u USING COVERING INDEX users_city (city=?) │ SEARCH o USING INDEX orders_user (user_id=?)\ndocument  : JSON inside SQL      97.7 ms   plan: SCAN user_docs │ SCAN json_each EXISTS VIRTUAL TABLE INDEX 3:\nkey-value : read every value    136.3 ms   (a KV store can only get by key; anything else = read all)\n\n== Q3: user 4242 moves house ==\nrelational: 1 row changed (addresses.id = 4242); every query that joins sees the new address\ndocuments : the address is copied into 6 documents (the user doc + 5 invoice docs of pending orders) — the app must find and change all 6\napp crashes after 3 of 6 updates, no transaction: 3 documents say the new 411004, 3 still say the old 477579 — which one is true?\nsame crash inside one transaction: 0 changed (ROLLBACK) — all old, consistent; the move must be redone\nno crash: 6 of 6 updated"
        }
      ],
      "observe": {
        "q": "ex1 Q3 mein 3 writes ke baad wala crash ek transaction ke andar hua. Kitne documents badle?",
        "choices": [
          "0 — ROLLBACK ne 3 writes wapas liye; sab purana par ek jaisa, move dobara karna hai",
          "3 — transaction sirf crash ke baad wale writes rokta hai, pehle wale bachte hain",
          "6 — transaction crash ke baad bhi bache hue writes khud poore kar deta hai"
        ],
        "answer": 0,
        "hint": "Transaction ka vaada kya hai: sab, ya kuch nahi?",
        "explain": "Transaction ka vaada: saare writes, ya ek bhi nahi. Crash par ROLLBACK, toh 0 badle. Data purana hai par ek jaisa — kisi courier ko do address nahi milte. Move dobara chalao, phir 6 ke 6.",
        "choiceExplanations": [
          "Transaction ka vaada: saare writes, ya ek bhi nahi. Crash par ROLLBACK, toh 0 badle. Data purana hai par ek jaisa — kisi courier ko do address nahi milte. Move dobara chalao, phir 6 ke 6.",
          "Transaction ke andar pehle ke writes bhi COMMIT tak pakke nahi.",
          "Transaction app ka kaam khud poora nahi karta; app ko dobara chalana padta hai."
        ]
      },
      "lesson": "Model aur asli SQLite dono: copies ke beech crash = mila-jula sach. Transaction sab-ya-kuch-nahi deta. Shape ka faayda sirf us sawaal par hai jiske liye shape bana."
    }
  ],
  "interview": {
    "title": "Interview Round — data ka shape",
    "instructions": "Pehle socho: app kaunse sawaal poochhegi, aur har fact kitni jagah likha hai? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Comments tez dikhane ke liye team ne user ka naam aur photo har comment document mein copy kiya. Ab users photo badalte hain toh purane comments par purani photo dikhti hai. Kya karoge?",
        "choices": [
          "Photo ka ek maalik tay karo: ek jagah rakh ke padhte waqt lo, ya har copy badalne ka pakka job banao",
          "Cache ka TTL chhota karo — purani photo sirf cache ki galti hai, documents theek hain",
          "Database badal do — Postgres par copies apne aap sahi ho jaati hain, document store par nahi",
          "Photo ki aur copies banao — zyada jagah sahi photo hogi toh purani photo kam dikhegi"
        ],
        "answer": 0,
        "explain": "Copy ka matlab: har copy badalne ka zimma app par. Video is kaam ko \"application code mein join sambhalna\" kehta hai. Ya toh photo ek jagah rakho aur padhte waqt jodo, ya badlaav ko har comment tak pahunchane ka retry wala job banao (lab ex1: bina transaction crash = 3 naye, 3 purane).",
        "choiceExplanations": [
          "Copy ka matlab: har copy badalne ka zimma app par. Video is kaam ko \"application code mein join sambhalna\" kehta hai. Ya toh photo ek jagah rakho aur padhte waqt jodo, ya badlaav ko har comment tak pahunchane ka retry wala job banao (lab ex1: bina transaction crash = 3 naye, 3 purane).",
          "Photo copies documents mein hi likhi hain; cache hata do tab bhi purani copy dikhegi.",
          "Postgres mein bhi copy ki toh copy badalni padti hai; farq shape ka hai, naam ka nahi.",
          "Zyada copies = zyada jagah badalna; purani photo aur zyada jagah bachegi."
        ]
      },
      {
        "q": "Naya app. Sawaal: user ki profile id se; pichhle mahine category-wise sales; refund mein balance 100% sahi. Pehla database kaisa?",
        "choices": [
          "Relational (jaise Postgres) — id lookup index se, sales GROUP BY se, balance transaction se",
          "Key-value — id lookup sabse tez hai, baaki do sawaal app code mein loop chala ke",
          "Document store — abhi schema ki zaroorat nahi, sawaal baad mein dekh lenge",
          "Teen alag databases abhi se — har sawaal ka apna sabse tez engine chahiye"
        ],
        "answer": 0,
        "explain": "Teeno sawaal ek relational database achhe se sambhal leta hai: lab ex1 mein id lookup microseconds mein, aur Q2 jaisa group sawaal index wale join se 11.2–12.2 ms. Video bhi kehta hai: shuruaat relational se, aur doosra engine tab jab naapa hua sawaal dard de.",
        "choiceExplanations": [
          "Teeno sawaal ek relational database achhe se sambhal leta hai: lab ex1 mein id lookup microseconds mein, aur Q2 jaisa group sawaal index wale join se 11.2–12.2 ms. Video bhi kehta hai: shuruaat relational se, aur doosra engine tab jab naapa hua sawaal dard de.",
          "Key-value par lab ka Q2 har value padh ke 136–156 ms; sales report har baar poora data padhegi.",
          "Sawaal baad mein dekhna ulta kram hai; shape sawaalon se chunte hain.",
          "Teen databases = teen jagah copies aur teeno ko sync rakhne ka kaam, bina naape dard ke."
        ]
      }
    ]
  },
  "success": [
    "Copies ka faayda aur kharcha numbers se samjha sakte ho",
    "Teen shapes mein kaunsa sawaal kahan tez, bata sakte ho",
    "Access pattern se shape chunna samjha sakte ho"
  ],
  "cards": [
    {
      "front": "Data ki copy (denormalization) ka kharcha?",
      "back": "Padhna tez, par har copy badalne ka zimma app par. Lab ex1: bina transaction crash = 3 docs naye, 3 purane; transaction ke saath ROLLBACK, sab ek jaisa."
    },
    {
      "front": "Lab 56 ex1: user page (Q1) teen shapes mein?",
      "back": "Same object: join + jodna 10.1–11.7 µs, document 2.7–3.3 µs, key-value (JS Map, network nahi) 1.1–1.4 µs. Sab microseconds — file RAM mein garam."
    },
    {
      "front": "Lab 56 ex1: Pune + biryani (Q2)?",
      "back": "Index wala join 11.2–12.2 ms; documents 98–106 ms (SCAN); key-value 136–156 ms (sab values padho). Shape doosre sawaal par scan karta hai."
    }
  ]
}
]);
})();
