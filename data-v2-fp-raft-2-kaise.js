/* First Principles — FAANG Senior Engineer.
   Source credit: Distributed Consensus & Raft (xU-7JxwUpLo), numbered video 9/15.
   Evidence: docker-labs/59-consensus/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "client", "icon": "📱", "label": "Client", "x": 140, "y": 55}, {"id": "n1", "icon": "👑", "label": "Node 1 (leader)", "x": 450, "y": 55}, {"id": "n2", "icon": "🗄️", "label": "Node 2", "x": 760, "y": 55}, {"id": "n3", "icon": "🗄️", "label": "Node 3", "x": 760, "y": 230}, {"id": "n4", "icon": "🗄️", "label": "Node 4", "x": 450, "y": 330}, {"id": "n5", "icon": "🗄️", "label": "Node 5", "x": 140, "y": 230}];
const EDGES = [{"from": "client", "to": "n1"}, {"from": "n1", "to": "n2"}, {"from": "n1", "to": "n3"}, {"from": "n1", "to": "n4"}, {"from": "n1", "to": "n5"}];
VISUALS["fp-raft-kaise"] = { t: "x=10 majority par committed. Leader mara. Up-to-date niyam bina x=10 wale node ko leader nahi banne deta.", html: SD.viz.svg(HERO, EDGES, { nodes: { client: {tone:'ok',badge:'ho gaya'}, n1: {tone:'bad',badge:'mara'}, n2: {tone:'ok',badge:'x=10'}, n3: {tone:'ok',badge:'x=10'}, n4: {tone:'busy',badge:'vote nahi milega'}, n5: {tone:'idle',badge:'x nahi'} } }, {w:900,h:400}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-raft-kaise",
  "icon": "📜",
  "group": "🗳️ Consensus & Raft",
  "title": "Raft 2 · Kaise — log, commit, aur up-to-date niyam",
  "badge": "Bahi-Khaata Rakshak",
  "objectives": [
    "Replicated log: entry committed kab hoti hai",
    "Up-to-date niyam ke bina committed entry kaise khoti hai",
    "Election timeout ki range ka sauda"
  ],
  "lesson": [
    "<h3>📒 Gaon ka bahi-khaata</h3><p>Mukhiya har faisla apne bahi-khaate mein likhta hai, aur paanch mein se kam se kam do aur log apni copy mein likh lein tab hi faisla \"pakka\". Mukhiya mar gaya. Agar naye mukhiya ke khaate mein pichhla pakka faisla likha hi nahi, toh faisla gaya.</p><p>Raft mein is galti ko ek chhota niyam rokta hai. Aaj up-to-date niyam dekhte hain.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "📜 Log, commit, aur ek niyam jo video ne chhod diya",
      "goal": "Raft ka replicated log. Har badlaav log ki ek entry hai. Entry tab committed jab majority (5 mein 3) ke log mein ho; tab hi client ko \"ho gaya\". Lab 59 ex3 (model) up-to-date niyam ke saath aur bina 10,000 baar chalata hai.",
      "nodes": [
        {
          "id": "client",
          "icon": "📱",
          "label": "Client",
          "x": 140,
          "y": 55
        },
        {
          "id": "n1",
          "icon": "👑",
          "label": "Node 1 (leader)",
          "x": 450,
          "y": 55
        },
        {
          "id": "n2",
          "icon": "🗄️",
          "label": "Node 2",
          "x": 760,
          "y": 55
        },
        {
          "id": "n3",
          "icon": "🗄️",
          "label": "Node 3",
          "x": 760,
          "y": 230
        },
        {
          "id": "n4",
          "icon": "🗄️",
          "label": "Node 4",
          "x": 450,
          "y": 330
        },
        {
          "id": "n5",
          "icon": "🗄️",
          "label": "Node 5",
          "x": 140,
          "y": 230
        }
      ],
      "edges": [
        {
          "from": "client",
          "to": "n1"
        },
        {
          "from": "n1",
          "to": "n2"
        },
        {
          "from": "n1",
          "to": "n3"
        },
        {
          "from": "n1",
          "to": "n4"
        },
        {
          "from": "n1",
          "to": "n5"
        }
      ],
      "viz": {
        "w": 900,
        "h": 400
      },
      "vars": [
        {
          "id": "x",
          "label": "x=10 kiske log mein"
        },
        {
          "id": "state",
          "label": "Haalat"
        },
        {
          "id": "client",
          "label": "Client ko"
        }
      ],
      "steps": [
        {
          "title": "1. Entry likhi",
          "clock": "append",
          "say": "Client: x = 10. Leader apne log mein entry likhta hai — abhi <b>uncommitted</b> — aur sabko AppendEntries bhejta hai.",
          "nodes": {
            "client": {
              "tone": "acc",
              "badge": "x=10"
            },
            "n1": {
              "tone": "busy",
              "badge": "log: x=10 ?"
            },
            "n2": {
              "tone": "idle",
              "badge": ""
            },
            "n3": {
              "tone": "idle",
              "badge": ""
            },
            "n4": {
              "tone": "idle",
              "badge": ""
            },
            "n5": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "x": "node 1",
            "state": "uncommitted",
            "client": "intezaar"
          },
          "flows": [
            {
              "from": "client",
              "to": "n1",
              "label": "x=10",
              "tone": "acc"
            },
            {
              "from": "n1",
              "to": "n2",
              "label": "",
              "tone": "busy"
            },
            {
              "from": "n1",
              "to": "n3",
              "label": "",
              "tone": "busy"
            },
            {
              "from": "n1",
              "to": "n4",
              "label": "",
              "tone": "busy"
            },
            {
              "from": "n1",
              "to": "n5",
              "label": "",
              "tone": "busy"
            }
          ]
        },
        {
          "title": "2. Majority ne likha",
          "clock": "commit",
          "say": "Nodes 2 aur 3 ne apne log mein likha aur ack bheja. Leader + 2 = 3 of 5 → <b>committed</b>. Leader state machine mein lagata hai aur client ko \"ho gaya\". Agli heartbeat mein followers ko commit ki khabar.",
          "nodes": {
            "client": {
              "tone": "ok",
              "badge": "ho gaya"
            },
            "n1": {
              "tone": "ok",
              "badge": "committed"
            },
            "n2": {
              "tone": "ok",
              "badge": "ack"
            },
            "n3": {
              "tone": "ok",
              "badge": "ack"
            },
            "n4": {
              "tone": "idle",
              "badge": "nahi pahuncha"
            },
            "n5": {
              "tone": "idle",
              "badge": "nahi pahuncha"
            }
          },
          "vars": {
            "x": "1, 2, 3",
            "state": "committed",
            "client": "ho gaya"
          },
          "flows": [
            {
              "from": "n2",
              "to": "n1",
              "label": "",
              "tone": "ok"
            },
            {
              "from": "n3",
              "to": "n1",
              "label": "",
              "tone": "ok"
            }
          ],
          "ask": {
            "q": "Leader apni disk par likhte hi \"ho gaya\" kyun nahi bolta?",
            "choices": [
              "Leader mare toh entry bhi jaati; majority par ho tab bachti",
              "Leader ki disk followers ki disk se dheemi hoti hai",
              "Client ko jawab dene ke liye followers ki ijaazat chahiye"
            ],
            "answer": 0,
            "hint": "Agar sirf leader ke paas entry ho aur leader mar jaaye?",
            "explain": "Majority par likhi entry ko koi bhi agla majority wala election dekh lega (do majorities milti hain). Sirf leader ke paas ho toh leader ke saath entry bhi gayi. Isliye commit = majority ke log mein.",
            "choiceExplanations": [
              "Majority par likhi entry ko koi bhi agla majority wala election dekh lega (do majorities milti hain). Sirf leader ke paas ho toh leader ke saath entry bhi gayi. Isliye commit = majority ke log mein.",
              "Disk ki raftaar ka sawaal nahi; sawaal entry kahan-kahan hai.",
              "Followers ijaazat nahi dete; followers copy rakh kar ack karte hain."
            ]
          }
        },
        {
          "title": "3. Leader mara",
          "clock": "crash",
          "say": "Commit ke turant baad node 1 gaya. x=10 nodes 2 aur 3 ke paas hai; 4 aur 5 ke paas nahi pahuncha.",
          "nodes": {
            "client": {
              "tone": "ok",
              "badge": "ho gaya mil chuka"
            },
            "n1": {
              "tone": "bad",
              "badge": "mara"
            },
            "n2": {
              "tone": "ok",
              "badge": "x=10"
            },
            "n3": {
              "tone": "ok",
              "badge": "x=10"
            },
            "n4": {
              "tone": "idle",
              "badge": "x nahi"
            },
            "n5": {
              "tone": "idle",
              "badge": "x nahi"
            }
          },
          "vars": {
            "x": "2, 3",
            "state": "committed (2 zinda copies)",
            "client": "ho gaya"
          }
        },
        {
          "title": "4. Bina niyam ke",
          "clock": "no rule",
          "say": "Node 4 ka timer pehle baja. Agar voters sirf \"is term mein vote diya?\" dekhein, toh 5, 2, 3 sab haan → node 4 leader. Node 4 followers se apna log copy karwata hai.",
          "nodes": {
            "client": {
              "tone": "bad",
              "badge": "jhooth suna"
            },
            "n1": {
              "tone": "idle",
              "badge": ""
            },
            "n2": {
              "tone": "bad",
              "badge": "x=10 mita"
            },
            "n3": {
              "tone": "bad",
              "badge": "x=10 mita"
            },
            "n4": {
              "tone": "bad",
              "badge": "leader"
            },
            "n5": {
              "tone": "ok",
              "badge": "haan"
            }
          },
          "vars": {
            "x": "kisi ke paas nahi",
            "state": "committed entry GAYI",
            "client": "jhooth"
          },
          "ask": {
            "q": "Client ko \"ho gaya\" mila tha, phir bhi x=10 gaya. Kahan galti hui?",
            "choices": [
              "Bina x=10 wala leader bana; voters ne log nahi dekha",
              "Majority par likhna kaafi nahi; sab 5 par likhna chahiye tha",
              "Leader ko commit se pehle client ko batana hi nahi chahiye tha"
            ],
            "answer": 0,
            "hint": "Node 2 ne node 4 ko vote kyun diya?",
            "explain": "Raft §5.4.1: voter tabhi vote deta hai jab candidate ka log kam se kam voter ke log jitna naya ho (aakhri entry ka term, phir log ki lambai). Video ne kaha \"is par baad mein baat karenge\" aur nahi ki. Lab 59 ex3: bina niyam 10,000 mein se 50.1% baar committed entry gayi.",
            "choiceExplanations": [
              "Raft §5.4.1: voter tabhi vote deta hai jab candidate ka log kam se kam voter ke log jitna naya ho (aakhri entry ka term, phir log ki lambai). Video ne kaha \"is par baad mein baat karenge\" aur nahi ki. Lab 59 ex3: bina niyam 10,000 mein se 50.1% baar committed entry gayi.",
              "Sab 5 par likhna = ek node gira toh koi commit nahi; majority hi sahi hai.",
              "Commit majority par hua tha; batana sahi tha, chunav galat tha."
            ]
          }
        },
        {
          "title": "5. Niyam ke saath",
          "clock": "rule",
          "say": "Ab nodes 2 aur 3 dekhte hain: node 4 ka log hamare log se purana → <b>vote nahi</b>. Node 4 ko sirf khud + node 5 = 2 votes. Agla timer node 2 ka: sab haan → node 2 leader, x=10 bacha.",
          "nodes": {
            "client": {
              "tone": "ok",
              "badge": "ho gaya sach"
            },
            "n1": {
              "tone": "idle",
              "badge": ""
            },
            "n2": {
              "tone": "ok",
              "badge": "leader, x=10"
            },
            "n3": {
              "tone": "ok",
              "badge": "x=10"
            },
            "n4": {
              "tone": "busy",
              "badge": "haara, follower"
            },
            "n5": {
              "tone": "ok",
              "badge": "x=10 copy"
            }
          },
          "vars": {
            "x": "2, 3, 4, 5",
            "state": "committed, bacha",
            "client": "sach"
          },
          "ask": {
            "q": "Niyam ke saath bina x=10 wala node kabhi leader kyun nahi ban sakta?",
            "choices": [
              "Har jeet'ne layak majority mein ek x=10 wala voter hai",
              "Bina x=10 wale node ka timer hamesha lamba hota hai",
              "Leader hamesha sabse chhote number wala node banta hai"
            ],
            "answer": 0,
            "hint": "3 votes ke liye kitne nodes chahiye, aur unmein x=10 wala kitna pakka hai?",
            "explain": "x=10 likhne wali majority (1, 2, 3) aur jeetne wali koi bhi majority — dono milti hain. Common voter ke paas x=10 hai, toh common voter bina x=10 wale ko vote nahi deta. Lab 59 ex3: niyam ke saath 0 committed entries gayi; keemat thode extra election rounds.",
            "choiceExplanations": [
              "x=10 likhne wali majority (1, 2, 3) aur jeetne wali koi bhi majority — dono milti hain. Common voter ke paas x=10 hai, toh common voter bina x=10 wale ko vote nahi deta. Lab 59 ex3: niyam ke saath 0 committed entries gayi; keemat thode extra election rounds.",
              "Timer random hai; lab mein bina x wala aksar pehle bajta hai — niyam bina x wale ko rokta hai.",
              "Raft node number nahi dekhta; term aur log dekhta hai."
            ]
          }
        }
      ],
      "lesson": "Commit = majority ke log mein. Naya leader banne ke liye majority ke votes chahiye, aur har voter tabhi vote deta hai jab candidate ka log voter ke log jitna naya ho. Up-to-date niyam ke saath committed entry naye leader tak pahunchti hai. (Raft ka ek aur niyam, §5.4.2: naya leader purane term ki entry ko sirf copies gin kar committed nahi maanta; apne term ki nayi entry majority par pahunche, tab purani entries bhi committed.)"
    },
    {
      "type": "cards",
      "title": "⏱️ Timeout ki range kitni chaudi?",
      "goal": "Lab 59 ex1 (model, seeded): 5 nodes, leader mara, baaki 4 naya leader chunte hain (majority 3). Har range par 10,000 elections; network 1–5 ms, koi packet loss nahi.",
      "lesson": "Bilkul same timeout = sab ek saath candidate = vote bant jaate hain. Thodi chaudai (150–200/300 ms) split votes ko lagbhag khatam karti hai. Bahut chaudi range har election ko lamba karti hai.",
      "steps": [
        {
          "title": "1. Lab ke numbers",
          "say": "Bilkul same (150–150): ek bhi election nahi jeeta (model mein jitter nahi). 150–155: 79.8% mein split vote, p99 3.4 s. 150–200: 7.0% split, median 165 ms. 150–300 (Raft paper ka example): 2.2% split, median 181 ms, p99 462 ms. 150–1500: 0.2% split, par median 370 ms, p99 1.1 s.",
          "ask": {
            "q": "150–1500 ms mein split vote sabse kam hai. Phir bhi 150–300 behtar kyun?",
            "choices": [
              "Range ka upar wala hissa bhi intezaar hai; leader der se",
              "Chaudi range mein network ke messages kho jaate hain",
              "Chaudi range mein do leaders ek term mein ban jaate hain"
            ],
            "answer": 0,
            "hint": "150–1500 ka median kitna tha, aur 150–300 ka?",
            "explain": "Split kam hone ka faayda tab tak hai jab tak range ka bada hissa khud intezaar na ban jaaye. Lab: 150–300 par median 181 ms, 150–1500 par 370 ms. Asli systems network ke hisaab se range rakhte hain (etcd ka default election timeout 1000 ms).",
            "choiceExplanations": [
              "Split kam hone ka faayda tab tak hai jab tak range ka bada hissa khud intezaar na ban jaaye. Lab: 150–300 par median 181 ms, 150–1500 par 370 ms. Asli systems network ke hisaab se range rakhte hain (etcd ka default election timeout 1000 ms).",
              "Model mein koi packet loss nahi; farq sirf intezaar ka hai.",
              "Range kitni bhi ho, ek term mein majority ek hi leader chunti hai."
            ]
          }
        },
        {
          "title": "2. Partition: lab 09 dekho",
          "say": "Video ka 2 | 3 partition asli 5 processes par lab 09 (ex2) chalata hai: chhoti taraf ka purana leader commit nahi kar paata, badi taraf naya leader chunti hai, network judne par purana leader bada term dekh kar follower banta hai aur apni uncommitted entry phenkta hai."
        },
        {
          "title": "3. Timeout = pata nahi",
          "say": "Chhoti taraf ke client ko \"ho gaya\" nahi milta, timeout milta hai. Timeout ka matlab \"fail\" nahi, \"pata nahi\": lab 09 mein ek aisi entry baad mein commit ho gayi. Isliye retry ek request id ke saath karo, taaki command do baar na chale."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Hazaaron elections, aur up-to-date niyam",
      "project": "59-consensus",
      "exercise": "ex3-up-to-date",
      "goal": "ex1: 5 timeout ranges × 10,000 elections. ex3: committed entry, leader mara — niyam ke saath aur bina.",
      "why": "Node 24+ chahiye. Dono seeded models hain, har run same (ex1 ~17 s leta hai).",
      "steps": [
        {
          "text": "Lab folder se: timeout ranges.",
          "cmd": "cd docker-labs/59-consensus && npm start -- ex1-election",
          "expect": "timeout range        split vote (≥1 baar)   naya leader: median     p99        sabse lamba\n150–150 ms           100.0%                 kabhi nahi — 10,000 mein se ek bhi election 1,000 rounds mein nahi jeeta\n150–155 ms            79.8%                   646 ms     3442 ms     7047 ms\n150–200 ms             7.0%                   165 ms      380 ms      762 ms\n150–300 ms             2.2%                   181 ms      462 ms      783 ms\n150–1500 ms            0.2%                   370 ms     1092 ms     2013 ms\n\nSab ka bilkul same timeout (150–150): har round mein chaaron ek saath candidate, sab khud ko vote → hamesha split. Asli\nprocesses mein bhi yahi hota hai: lab 09 ka SAME_TIMEOUT run 10 s mein koi leader nahi chun paaya (105 elections).\nRange chaudi = kam split votes, par range ka upar wala hissa bhi intezaar badhaata hai (150–1500: p99 lamba).\nModel: sirf 1–5 ms ka network, koi packet loss nahi, koi disk nahi. Lab 09 asli 5 processes par election dikhata hai."
        },
        {
          "text": "Up-to-date niyam.",
          "cmd": "npm start -- ex3-up-to-date",
          "expect": "5 nodes. Entry X leader 1 + 2 followers par (majority) → committed, client ko \"ho gaya\". Leader 1 mara.\nNodes 2–5 mein se 2 ke paas X, 2 ke paas nahi. 10,000 baar, timers ka kram random.\n\nvote ka niyam                                   committed X kho gaya     extra election rounds\nkoi bhi candidate, pehle aaye ko vote           5,007 (50.1%)           0\ncandidate ka log mere jitna naya ho (§5.4.1)        0 (0.0%)           6,702\n\nBina niyam: pehle timer wala node leader banta hai — aadhe baar bina X wala node. Naya leader followers se apna\nlog copy karwata hai → X mit jaata hai, jabki client ko \"ho gaya\" bola ja chuka tha.\nNiyam ke saath: X wale nodes bina X wale candidate ko vote nahi dete; bina X wala 3 votes nahi jod sakta (khud + 1).\nKyunki X majority par hai, har jeetne layak majority mein kam se kam ek X wala voter hota hai. Keemat: kuch extra rounds."
        }
      ],
      "observe": {
        "q": "ex3 mein niyam ke saath 6,702 extra election rounds lage. Keemat kyun?",
        "choices": [
          "Bina x wala candidate haara; agle node ko dobara ladna pada",
          "Niyam ke saath har vote do baar gina jaata hai",
          "Niyam ke saath leader ko har entry sab 5 nodes par likhni padti hai"
        ],
        "answer": 0,
        "hint": "Niyam bina x wale candidate ke saath kya karta hai?",
        "explain": "Niyam ke saath bina x wala candidate majority nahi jod paata, toh election us term mein bekaar gaya aur agle timer wale ne naya term shuru kiya. Safety ki keemat: kabhi-kabhi ek extra election (sau-do sau ms). Committed data khone ke muqable sasta.",
        "choiceExplanations": [
          "Niyam ke saath bina x wala candidate majority nahi jod paata, toh election us term mein bekaar gaya aur agle timer wale ne naya term shuru kiya. Safety ki keemat: kabhi-kabhi ek extra election (sau-do sau ms). Committed data khone ke muqable sasta.",
          "Har vote ek baar hi ginta hai; extra rounds haare hue candidates ki wajah se hain.",
          "Commit ab bhi majority par hi hota hai."
        ]
      },
      "lesson": "Commit majority par; leader sirf up-to-date log wala. Timeout ki range thodi chaudi, bahut nahi."
    }
  ],
  "interview": {
    "title": "Interview Round — log aur election",
    "instructions": "Pehle socho: committed entry kitni jagah hai, aur naya leader kaun ban sakta hai? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Tumhare Raft implementation mein ek bug: voter sirf term check karta hai, log nahi. Kya ho sakta hai?",
        "choices": [
          "Purane log wala leader ban sakta; committed entries mitengi",
          "Kuch nahi — term check se hi ek term mein ek leader pakka hai",
          "Sirf election thoda dheema hoga, data par asar nahi",
          "Do leaders ek term mein ban jaayenge"
        ],
        "answer": 0,
        "explain": "Term check ek term mein ek leader deta hai, par kaunsa leader, log check tay karta hai. Bina log check ke purane log wala node jeet sakta hai aur followers ko apna log copy karwaata hai: committed entries gayab (lab 59 ex3: 50.1% baar).",
        "choiceExplanations": [
          "Term check ek term mein ek leader deta hai, par kaunsa leader, log check tay karta hai. Bina log check ke purane log wala node jeet sakta hai aur followers ko apna log copy karwaata hai: committed entries gayab (lab 59 ex3: 50.1% baar).",
          "Ek leader hona kaafi nahi; sahi log wala leader chahiye.",
          "Data par asar seedha: committed entry mit'ti hai.",
          "Term check ab bhi ek term mein ek leader rakhta hai; bug log ka hai."
        ]
      },
      {
        "q": "Client ne write bheja, 2 s mein timeout mila. Retry karein?",
        "choices": [
          "Haan, same request id ke saath; pehli write commit ho sakti",
          "Haan, seedha dobara bhejo — timeout ka matlab write fail hua",
          "Nahi — timeout ke baad write kabhi commit nahi hoti",
          "Nahi — Raft khud retry karta hai, client kuch na kare"
        ],
        "answer": 0,
        "explain": "Timeout = pata nahi. Entry log mein pahunch chuki ho sakti hai aur baad mein majority par commit ho sakti hai (lab 09 ex2 mein aisa hua). Bina request id ke retry = command do baar (jaise dohra charge). Raft §8 bhi client ke liye request id batata hai.",
        "choiceExplanations": [
          "Timeout = pata nahi. Entry log mein pahunch chuki ho sakti hai aur baad mein majority par commit ho sakti hai (lab 09 ex2 mein aisa hua). Bina request id ke retry = command do baar (jaise dohra charge). Raft §8 bhi client ke liye request id batata hai.",
          "Timeout fail ka saboot nahi; pehli write baad mein commit ho sakti hai.",
          "Lab 09 mein timeout wali entry baad mein commit hui thi.",
          "Raft leader client ko jawab deta hai; client ke liye retry tay karna client ka kaam hai."
        ]
      }
    ]
  },
  "success": [
    "Commit ka matlab (majority ke log mein) samjha sakte ho",
    "Up-to-date niyam aur niyam ki zaroorat lab ke numbers se bata sakte ho",
    "Timeout range ka sauda samjha sakte ho"
  ],
  "cards": [
    {
      "front": "Raft entry committed kab?",
      "back": "Jab majority ke log mein ho (5 mein 3, leader samet). Tab hi client ko \"ho gaya\"; followers ko agli heartbeat mein commit ki khabar."
    },
    {
      "front": "Up-to-date niyam?",
      "back": "Voter tabhi vote de jab candidate ka log voter ke log jitna naya ho (Raft §5.4.1). Lab 59 ex3: bina niyam 50.1% baar committed entry gayi, niyam ke saath 0."
    },
    {
      "front": "Election timeout range?",
      "back": "Same = split votes. Lab 59 ex1 (model): 150–300 ms par 2.2% split, median 181 ms; 150–1500 par split kam par median 370 ms."
    }
  ]
}
]);
})();
