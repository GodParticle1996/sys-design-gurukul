/* First Principles — FAANG Senior Engineer.
   Source credit: The Taxonomy of Storage (mhpinZnH7xI), numbered video 6/15.
   Evidence: docker-labs/56-storage-taxonomy/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "q", "icon": "🔎", "label": "Q1 query", "x": 130, "y": 145}, {"id": "idx", "icon": "📇", "label": "orders_user index", "x": 470, "y": 70}, {"id": "tab", "icon": "📚", "label": "orders table", "x": 470, "y": 220}, {"id": "res", "icon": "📋", "label": "Asha ke 5 orders", "x": 780, "y": 145}];
const EDGES = [{"from": "q", "to": "idx"}, {"from": "q", "to": "tab"}, {"from": "idx", "to": "res"}, {"from": "tab", "to": "res"}];
VISUALS["fp-tax-kaise"] = { t: "Lab 56 ke chhote-result, garam-cache sawaalon mein missing index sabse bada kharcha tha.", html: SD.viz.svg(HERO, EDGES, { nodes: { q: {tone:'acc',badge:'Q1'}, idx: {tone:'ok',badge:'SEARCH'}, tab: {tone:'bad',badge:'SCAN'}, res: {tone:'ok',badge:'5 rows'} } }, {w:890,h:290}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-tax-kaise",
  "icon": "🗂️",
  "group": "🗂️ Taxonomy of Storage",
  "title": "Taxonomy 2 · Kaise — join tax aur graph walk",
  "badge": "Join Jaasoos",
  "objectives": [
    "Kya join table badhne par dheema hota hai? Index ka kya role hai?",
    "Friend-of-friend: SQL aur graph walk mein asli farq kahan hai?",
    "Graph model kab sach mein kaam aata hai?"
  ],
  "lesson": [
    "<h3>📚 Library ka catalogue</h3><p>Library mein 100 kitaabein hon ya 1 lakh — catalogue card se ek kitaab dhoondhne mein lagbhag utna hi samay. Catalogue na ho toh har shelf ki har kitaab dekhni padti hai, aur library jitni badi, utna samay.</p><p>Video kehta hai joins bade data par bahut mehnge hain, aur SQL friend-of-friend par 'cheekhta' hai. Aaj asli SQLite par naapte hain: dard join ka hai, ya catalogue (index) ke na hone ka?</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "📇 Join tax: table badi, query dheemi?",
      "goal": "Lab 56 ex2, asli SQLite. Q1 (user + address + aakhri 5 orders) 10,000 se 10 lakh users tak, orders.user_id par index ke saath aur bina. Har user ke 5 orders.",
      "nodes": [
        {
          "id": "q",
          "icon": "🔎",
          "label": "Q1 query",
          "x": 130,
          "y": 145
        },
        {
          "id": "idx",
          "icon": "📇",
          "label": "orders_user index",
          "x": 470,
          "y": 70
        },
        {
          "id": "tab",
          "icon": "📚",
          "label": "orders table",
          "x": 470,
          "y": 220
        },
        {
          "id": "res",
          "icon": "📋",
          "label": "Asha ke 5 orders",
          "x": 780,
          "y": 145
        }
      ],
      "edges": [
        {
          "from": "q",
          "to": "idx"
        },
        {
          "from": "q",
          "to": "tab"
        },
        {
          "from": "idx",
          "to": "res"
        },
        {
          "from": "tab",
          "to": "res"
        }
      ],
      "viz": {
        "w": 890,
        "h": 290
      },
      "vars": [
        {
          "id": "users",
          "label": "Users"
        },
        {
          "id": "with",
          "label": "Index ke saath"
        },
        {
          "id": "without",
          "label": "Bina index"
        }
      ],
      "steps": [
        {
          "title": "10,000 users",
          "clock": "10k",
          "say": "Plan: <code>SEARCH o USING INDEX orders_user</code>. Index Asha ke 5 orders tak seedha le jaata hai. Samay: <b>7.7–9.4 µs</b>.",
          "nodes": {
            "q": {
              "tone": "acc",
              "badge": "Q1"
            },
            "idx": {
              "tone": "ok",
              "badge": "SEARCH"
            },
            "tab": {
              "tone": "idle",
              "badge": ""
            },
            "res": {
              "tone": "ok",
              "badge": "5 rows"
            }
          },
          "vars": {
            "users": "10,000",
            "with": "7.7–9.4 µs",
            "without": "?"
          },
          "flows": [
            {
              "from": "q",
              "to": "idx",
              "label": "SEARCH",
              "tone": "ok"
            },
            {
              "from": "idx",
              "to": "res",
              "label": "",
              "tone": "ok"
            }
          ],
          "ask": {
            "q": "Users 100 guna ho gaye (10 lakh, 50 lakh orders). Index wala join kitna dheema hoga?",
            "choices": [
              "Lagbhag utna hi — index seedha Asha ke 5 orders tak; matching rows 5 hi rehti hain",
              "100 guna — join ka samay hamesha poori table ke size ke saath barabar badhta hai",
              "10,000 guna — join har row ko doosri table ki har row se milata hai"
            ],
            "answer": 0,
            "hint": "Index se 5 orders tak pahunchne ke liye kitne pages chalne padte hain?",
            "explain": "Index ek B-tree hai: 50 lakh orders par bhi kuch hi pages ka raasta. Lab: 10 lakh users par 10.8–14.2 µs. Users 100 guna, samay ~1.5 guna. Is lab mein har user ke sirf 5 orders aur cache garam hai; zyada matching rows, sort ya thande cache par join ka kharcha badhta hai.",
            "choiceExplanations": [
              "Index ek B-tree hai: 50 lakh orders par bhi kuch hi pages ka raasta. Lab: 10 lakh users par 10.8–14.2 µs. Users 100 guna, samay ~1.5 guna. Is lab mein har user ke sirf 5 orders aur cache garam hai; zyada matching rows, sort ya thande cache par join ka kharcha badhta hai.",
              "Lab mein 100 guna users par samay sirf ~1.5 guna badha.",
              "Har row ko har row se milana tab hota jab na index ho na koi aur raasta; plan SEARCH dikhata hai."
            ]
          }
        },
        {
          "title": "10 lakh users",
          "clock": "10L",
          "say": "Index ke saath: <b>10.8–14.2 µs</b>. Users 100 guna, samay ~1.5 guna.",
          "nodes": {
            "q": {
              "tone": "acc",
              "badge": "Q1"
            },
            "idx": {
              "tone": "ok",
              "badge": "SEARCH"
            },
            "tab": {
              "tone": "idle",
              "badge": "50 lakh"
            },
            "res": {
              "tone": "ok",
              "badge": "5 rows"
            }
          },
          "vars": {
            "users": "10,00,000",
            "with": "10.8–14.2 µs",
            "without": "?"
          },
          "flows": [
            {
              "from": "q",
              "to": "idx",
              "label": "SEARCH",
              "tone": "ok"
            },
            {
              "from": "idx",
              "to": "res",
              "label": "",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "Index hatao",
          "clock": "bina index",
          "say": "Ab <code>orders_user</code> index nahi. Plan: <code>SCAN o</code> — har order padho, Asha wale chhaanto. 10,000 users par: <b>1.2–1.4 ms</b>.",
          "nodes": {
            "q": {
              "tone": "acc",
              "badge": "Q1"
            },
            "idx": {
              "tone": "idle",
              "badge": "—"
            },
            "tab": {
              "tone": "bad",
              "badge": "SCAN"
            },
            "res": {
              "tone": "ok",
              "badge": "5 rows"
            }
          },
          "vars": {
            "users": "10,000",
            "with": "7.7–9.4 µs",
            "without": "1.2–1.4 ms"
          },
          "flows": [
            {
              "from": "q",
              "to": "tab",
              "label": "SCAN",
              "tone": "bad"
            },
            {
              "from": "tab",
              "to": "res",
              "label": "",
              "tone": "ok"
            }
          ],
          "ask": {
            "q": "Bina index, 10 lakh users (50 lakh orders) par Q1?",
            "choices": [
              "~100 guna dheema (140–161 ms) — har query har order padhti hai, toh samay table ke saath badhta hai",
              "Utna hi (1.2–1.4 ms) — SQLite pehli query ke baad apne aap index bana ke rakh leta hai",
              "Thoda sa dheema — orders ek hi file mein hain, toh poori file ek jhatke mein padh li jaati hai"
            ],
            "answer": 0,
            "hint": "SCAN ka matlab kya hai: kuch rows, ya saari rows?",
            "explain": "SCAN o = saare orders padhna. 50 lakh orders par lab: 139.9–161.4 ms, yaani 10,000 users ke ~100 guna. Lab 56 ex2 ka bada kharcha missing orders_user index se aaya. Doosri queries mein matching rows, sort aur disk reads bhi join ka kharcha badha sakte hain.",
            "choiceExplanations": [
              "SCAN o = saare orders padhna. 50 lakh orders par lab: 139.9–161.4 ms, yaani 10,000 users ke ~100 guna. Lab 56 ex2 ka bada kharcha missing orders_user index se aaya. Doosri queries mein matching rows, sort aur disk reads bhi join ka kharcha badha sakte hain.",
              "Plan teeno size par SCAN o dikhata hai; is query ke liye SQLite ne index nahi banaya.",
              "Ek file ho toh bhi 50 lakh rows padhna 50 lakh rows ka kaam hai."
            ]
          }
        },
        {
          "title": "Thanda cache",
          "clock": "cold",
          "say": "Lab ki file OS ke page cache (RAM) mein garam hai. Restart ke baad thande cache par har B-tree page disk read ban sakta hai (lab 55 ex4). Tab bhi index wala raasta kuch pages ka, SCAN poori table ka.",
          "nodes": {
            "q": {
              "tone": "acc",
              "badge": "Q1"
            },
            "idx": {
              "tone": "busy",
              "badge": "kuch pages"
            },
            "tab": {
              "tone": "bad",
              "badge": "saare pages"
            },
            "res": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "users": "10,00,000",
            "with": "kuch page reads",
            "without": "poori table"
          }
        }
      ],
      "lesson": "Lab 56 ex2, teen runs (har user ke 5 orders, garam cache): index ke saath 7.7–9.4 → 10.8–14.2 µs; bina index 1.2–1.4 → 139.9–161.4 ms. Pehle query plan aur matching rows dekho."
    },
    {
      "type": "cards",
      "title": "🕸️ Dost ke dost: SQL ya graph walk?",
      "goal": "Lab 56 ex3, asli SQLite + JS. Har user ke 20 random dost. Sawaal: 2 kadam ki walks ke alag endpoints (SQL self-join bhi in endpoints ko ginta hai). Teen tareeke: SQL index ke saath, SQL bina index, aur adjacency walk (har user ke dost seedhe ek array mein — graph database jaisa idea).",
      "lesson": "Graph walk 2 hops par bhi ~8–9× tez hai, par index wala SQL bhi sub-millisecond hai. Seconds sirf bina index aate hain. Walk ka kaam har layer ke khole gaye nodes aur edges ke saath badhta hai.",
      "steps": [
        {
          "title": "1. SQL 'cheekhta' hai?",
          "say": "10 lakh users (2 crore friend rows), friend-of-friend: SQL + index <b>162–168 µs</b>, SQL bina index <b>5.0–5.2 s</b>, adjacency walk <b>18.6–19.6 µs</b>.",
          "ask": {
            "q": "Video kehta hai friend-of-friend par SQL 'scream' karega. Lab mein 10 lakh users par kya dikha?",
            "choices": [
              "Seconds sirf bina index; index ke saath SQL 0.3 ms se kam, walk SQL se ~8–9× tez",
              "Haan — SQL index ke saath bhi seconds leta hai; sirf graph walk microseconds mein",
              "Nahi — index wala SQL graph walk se tez hai, toh graph shape ka koi faayda nahi"
            ],
            "answer": 0,
            "hint": "Teen numbers milao: bina index, index ke saath, walk.",
            "explain": "Seconds sirf bina index (5.0–5.2 s): har query poori friends table padhti hai. Index ke saath 162–168 µs — zyadatar apps ke liye kaafi. Walk 19–20 µs: dost seedhe array mein, koi index lookup nahi. Graph shape ka faayda asli hai; dard ki jad index ka na hona.",
            "choiceExplanations": [
              "Seconds sirf bina index (5.0–5.2 s): har query poori friends table padhti hai. Index ke saath 162–168 µs — zyadatar apps ke liye kaafi. Walk 19–20 µs: dost seedhe array mein, koi index lookup nahi. Graph shape ka faayda asli hai; dard ki jad index ka na hona.",
              "Index ke saath SQL ne 10 lakh users par bhi 0.3 ms se kam liya.",
              "Teeno runs mein walk index wale SQL se ~8–9× tez raha."
            ]
          }
        },
        {
          "title": "2. Hop badhao",
          "say": "1 lakh users, adjacency walk: 1 hop 20 endpoints · 2 hops 400 (2.9–3.9 µs) · 3 hops 7,670 (56–61 µs) · 4 hops 78,434 (3.0–4.2 ms).",
          "ask": {
            "q": "Walk ka samay kis cheez ke saath badha?",
            "choices": [
              "Har layer ke khole nodes aur dekhe edges ke saath — total users ke saath nahi",
              "Total users ke saath — har hop par saare 1 lakh users dekhe gaye",
              "Hops ki ginti ke saath barabar — har hop ka samay same, chahe kitne bhi nodes khulein"
            ],
            "answer": 0,
            "hint": "Har hop par walk kya-kya karta hai: nodes kholna, edges dekhna, dedupe?",
            "explain": "Walk har layer ke nodes kholta hai, har node ke edges dekhta hai aur endpoints dedupe karta hai. Final endpoints akela kaam nahi batate: 3 se 4 hops par endpoints ~10×, samay ~50–75× badha. Memory aur allocation ka asar alag se nahi naapa. Gehre sawaalon mein SQL ko har hop ek aur join chahiye; lab ne gehre hops par SQL nahi naapa.",
            "choiceExplanations": [
              "Walk har layer ke nodes kholta hai, har node ke edges dekhta hai aur endpoints dedupe karta hai. Final endpoints akela kaam nahi batate: 3 se 4 hops par endpoints ~10×, samay ~50–75× badha. Memory aur allocation ka asar alag se nahi naapa. Gehre sawaalon mein SQL ko har hop ek aur join chahiye; lab ne gehre hops par SQL nahi naapa.",
              "Users 1 lakh hi rahe; samay hops ke saath badla, total ke saath nahi.",
              "3 se 4 hops par samay ~50–75× badha, endpoints ~10×; har hop ka samay same nahi."
            ]
          }
        },
        {
          "title": "3. Naam",
          "say": "Rishte ko pointer ki tarah rakhna, index se dhoondhna nahi: <b>index-free adjacency</b>. Ek dost se agle dost tak chalna: <b>traversal</b>, har kadam ek <b>hop</b>. Poori table padhna: <b>full scan</b>. Jaldi dhoondhne ka sorted dhaancha: <b>B-tree index</b>."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Join aur graph, asli SQLite par",
      "project": "56-storage-taxonomy",
      "exercise": "ex2-join",
      "goal": "10,000 → 10 lakh users: join index ke saath aur bina (ex2), phir friend-of-friend teen tareekon se aur 1–4 hops (ex3).",
      "why": "Node 24+ chahiye. Dono asli SQLite hain; har size ki nayi file banti hai, toh ex2 ~20 second aur ex3 ~1 minute chalta hai. Samay machine ke saath badlega.",
      "steps": [
        {
          "text": "Lab folder se: join.",
          "cmd": "cd docker-labs/56-storage-taxonomy && npm start -- ex2-join",
          "expect": "REAL RUN: Node v24.18.0; each size built fresh in a temp SQLite file; 5 orders per user\n\nusers        orders      with index on orders.user_id   without index           plan without index\n10,000       50,000                            7.7 µs          1.2 ms           SCAN o\n1,00,000     5,00,000                          9.8 µs         13.1 ms           SCAN o\n10,00,000    50,00,000                        10.8 µs        139.9 ms           SCAN o\nWith the index, the join walks a few B-tree pages: the time barely moves. Without it, every query reads every order."
        },
        {
          "text": "Friend of friend.",
          "cmd": "npm start -- ex3-graph",
          "expect": "REAL RUN: Node v24.18.0; 20 random friends per user; friend-of-friend = distinct endpoints of 2-edge walks (what the SQL counts)\n\nusers        friend rows   answer   SQL + index      SQL, no index (1 query)   adjacency walk\n10,000          2,00,000      393       90.0 µs                   45.7 ms             4.6 µs\n1,00,000       20,00,000      400      110.9 µs                  474.8 ms             9.5 µs\n10,00,000    2,00,00,000      400      165.9 µs                 4969.8 ms            19.6 µs\n\n== deeper: 1 lakh users, how far does one user reach? (adjacency walk) ==\n1 hop :      20 people     15.4 µs\n2 hops:     400 people      2.9 µs\n3 hops:   7,670 people     56.1 µs\n4 hops:  78,434 people      3.0 ms\nThe work follows how many people you reach. Medians: SQL + index and the walk over 200 users each."
        }
      ],
      "observe": {
        "q": "ex3 mein users 100 guna (10,000 → 10 lakh) hue. Walk 4.6–5.8 µs se 18.6–19.6 µs, index wala SQL 90–111 µs se 162–168 µs. Numbers se kya seekhoge?",
        "choices": [
          "Dono lagbhag size se be-asar (~2–4×); bada farq sirf bina index aaya (46 ms → 5.2 s)",
          "Walk users ke saath seedha 100 guna badha, toh graph bade data par kaam ka nahi",
          "SQL users ke saath 100 guna dheema hua, toh bade data par sirf graph chalega"
        ],
        "answer": 0,
        "hint": "Kis tareeke ka samay users ke saath ~100 guna badha?",
        "explain": "Walk ~3–4×, index wala SQL ~1.5–2×: dono sirf chhue gaye rows ka kaam karte hain. Bina index 46–52 ms se 5.0–5.2 s — ~100×, kyunki har query poori table padhti hai. Size ka dard index ke na hone mein hai.",
        "choiceExplanations": [
          "Walk ~3–4×, index wala SQL ~1.5–2×: dono sirf chhue gaye rows ka kaam karte hain. Bina index 46–52 ms se 5.0–5.2 s — ~100×, kyunki har query poori table padhti hai. Size ka dard index ke na hone mein hai.",
          "Walk 100 guna nahi, ~3–4 guna badha.",
          "Index wala SQL ~2 guna badha; 100 guna sirf bina index wala."
        ]
      },
      "lesson": "Lab 56 ke chhote-result, garam-cache sawaalon mein missing index sabse bada kharcha tha: join aur 2-hop dono mein seconds bina index aaye. Doosre joins mein matching rows, sort aur disk reads bhi samay badha sakte hain. Index ke saath 2-hop SQL 0.3 ms se kam; walk ~8–9× aur tez."
    }
  ],
  "interview": {
    "title": "Interview Round — join aur graph",
    "instructions": "Pehle socho: query plan kya kehta hai, aur sawaal kitne hops gehra hai? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Social feed: \"aapke doston ke dost jo Pune mein hain\". Postgres mein query 4 second leti hai. Pehla kadam?",
        "choices": [
          "EXPLAIN dekho — friends(user_id) par index hai? Bina index har query poori friends table padhti hai",
          "Turant graph database par migrate karo — SQL graph wale sawaalon ke liye bana hi nahi hai",
          "Database server ki RAM dugni karo — zyada RAM mein poori friends table aa jaayegi",
          "Query raat mein ek baar chala ke nateeja cache karo — feed din bhar raat ka cached nateeja dikhayegi"
        ],
        "answer": 0,
        "explain": "Pehle naapo: lab ex3 mein bina index 2-hop 10 lakh users par 5.0–5.2 s, index ke saath 162–168 µs. 4 second ka pattern bina index wala lagta hai. EXPLAIN mein SCAN dikhe toh index lagao, phir naapo.",
        "choiceExplanations": [
          "Pehle naapo: lab ex3 mein bina index 2-hop 10 lakh users par 5.0–5.2 s, index ke saath 162–168 µs. 4 second ka pattern bina index wala lagta hai. EXPLAIN mein SCAN dikhe toh index lagao, phir naapo.",
          "Index ke saath SQL 0.3 ms se kam aaya; migration bina naape bada kharcha, aur pehli wajah index thi.",
          "RAM se scan thoda tez ho sakta hai, par har query phir bhi poori table padhegi.",
          "Dost din mein badalte hain; raat ka cache purana feed dikhayega, aur jad ki wajah bachi rahegi."
        ]
      },
      {
        "q": "Fraud team: \"kya ek account 5 hops ke andar kisi blocked account se juda hai?\" Lakhon accounts. Kya sochoge?",
        "choices": [
          "Gehra traversal — 5-hop ke liye graph DB ya adjacency walk evaluate karo",
          "SQL mein 5 self-joins likho — index ho toh 5 hops bhi 2 hops jitne tez rahenge",
          "Key-value store lo — account id se lookup sabse tez hai, toh 5 hops bhi tez",
          "Har account ke document mein 5 hop tak ke saare accounts copy karke rakho"
        ],
        "answer": 0,
        "explain": "Hops ke saath pahunche hue log tezi se badhte hain (lab ex3: 4 hops par 1 lakh users mein 78,434 endpoints). SQL mein har hop ek aur join aur bada beech ka nateeja; graph walk seedhe pointers chalta hai aur raasta milte hi ruk sakta hai. Gehre sawaal graph model ki asli wajah hain.",
        "choiceExplanations": [
          "Hops ke saath pahunche hue log tezi se badhte hain (lab ex3: 4 hops par 1 lakh users mein 78,434 endpoints). SQL mein har hop ek aur join aur bada beech ka nateeja; graph walk seedhe pointers chalta hai aur raasta milte hi ruk sakta hai. Gehre sawaal graph model ki asli wajah hain.",
          "Har hop par endpoints ~10–20 guna badhe; 5 joins ka beech ka nateeja bahut bada ho jaata hai.",
          "Key-value ek lookup tez deta hai, par 5 hops = lakhon lookups app code mein.",
          "5 hops ki copies har naye rishte par lakhon documents badalwayengi."
        ]
      }
    ]
  },
  "success": [
    "Join ka kharcha index se jod ke samjha sakte ho",
    "SQL vs graph walk ka farq numbers se bata sakte ho",
    "Graph model kab chahiye, pehchaan sakte ho"
  ],
  "cards": [
    {
      "front": "Lab 56 ex2: join, 10,000 → 10 lakh users?",
      "back": "Index ke saath 7.7–9.4 → 10.8–14.2 µs (lagbhag same). Bina index 1.2–1.4 → 139.9–161.4 ms (SCAN, ~100×). Lab ka bada kharcha missing index ka tha (5 orders per user, garam cache)."
    },
    {
      "front": "Lab 56 ex3: friend-of-friend, 10 lakh users?",
      "back": "SQL + index 162–168 µs; adjacency walk 18.6–19.6 µs (~8–9× tez); SQL bina index 5.0–5.2 s. Seconds sirf bina index."
    },
    {
      "front": "Graph model kab?",
      "back": "Gehre traversals (3+ hops, raaste). Walk ka kaam har layer ke khole nodes aur edges par: 1 lakh mein 2 hops 400, 3 hops 7,670, 4 hops 78,434."
    }
  ]
}
]);
})();
