/* First Principles — FAANG Senior Engineer.
   Source credit: Distributed Consensus & Raft (xU-7JxwUpLo), numbered video 9/15.
   Evidence: docker-labs/59-consensus/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "n1", "icon": "👑", "label": "Node 1 (leader)", "x": 450, "y": 55}, {"id": "n2", "icon": "🗄️", "label": "Node 2", "x": 160, "y": 160}, {"id": "n3", "icon": "🗄️", "label": "Node 3", "x": 740, "y": 160}, {"id": "n4", "icon": "🗄️", "label": "Node 4", "x": 250, "y": 330}, {"id": "n5", "icon": "🗄️", "label": "Node 5", "x": 650, "y": 330}];
const EDGES = [{"from": "n1", "to": "n2"}, {"from": "n1", "to": "n3"}, {"from": "n1", "to": "n4"}, {"from": "n1", "to": "n5"}, {"from": "n3", "to": "n2"}, {"from": "n3", "to": "n4"}, {"from": "n3", "to": "n5"}];
VISUALS["fp-raft-kyun"] = { t: "Leader gaya. Pehle timer wala candidate bana, term badhaya, majority se jeeta.", html: SD.viz.svg(HERO, EDGES, { nodes: { n1: {tone:'bad',badge:'mara'}, n2: {tone:'ok',badge:'vote'}, n3: {tone:'acc',badge:'naya leader'}, n4: {tone:'ok',badge:'vote'}, n5: {tone:'ok',badge:'vote'} } }, {w:900,h:400}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-raft-kyun",
  "icon": "👑",
  "group": "🗳️ Consensus & Raft",
  "title": "Raft 1 · Kyun — paanch naazuk machines, ek raja",
  "badge": "Chunav Adhikari",
  "objectives": [
    "Heartbeat, random timeout aur term se naya leader kaise chunta hai",
    "Majority kyun: do majorities hamesha milti hain",
    "3, 4 ya 5 nodes: odd N kyun"
  ],
  "lesson": [
    "<h3>🥫 Tin ke dabbe wale telephone</h3><p>Paanch log paanch kamron mein, sirf tin ke dabbe aur dhaage se baat kar sakte hain. Kabhi dhaaga kat'ta hai, kabhi koi so jaata hai, kabhi awaaz der se pahunchti hai. Paanchon ko ek hi baat par raazi karna hai — jaise \"aaj ka mukhiya kaun?\"</p><p>Ek mukhiya chuno, baaki log mukhiya ki baat likhein. Mukhiya chup ho jaaye toh naya mukhiya. Aaj dekhte hain naya mukhiya bina jhagde kaise chuna jaata hai.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "👑 Raja gaya — paanch kamron mein naya raja kaise chuna jaaye?",
      "goal": "Raft (Ongaro & Ousterhout, 2014). 5 nodes, ek leader. Leader har thodi der heartbeat bhejta hai (\"main zinda hoon\"). Har follower ke paas ek random election timeout hai — Raft paper ka example 150–300 ms.",
      "nodes": [
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
          "x": 160,
          "y": 160
        },
        {
          "id": "n3",
          "icon": "🗄️",
          "label": "Node 3",
          "x": 740,
          "y": 160
        },
        {
          "id": "n4",
          "icon": "🗄️",
          "label": "Node 4",
          "x": 250,
          "y": 330
        },
        {
          "id": "n5",
          "icon": "🗄️",
          "label": "Node 5",
          "x": 650,
          "y": 330
        }
      ],
      "edges": [
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
        },
        {
          "from": "n3",
          "to": "n2"
        },
        {
          "from": "n3",
          "to": "n4"
        },
        {
          "from": "n3",
          "to": "n5"
        }
      ],
      "viz": {
        "w": 900,
        "h": 400
      },
      "vars": [
        {
          "id": "term",
          "label": "Term"
        },
        {
          "id": "votes",
          "label": "Node 3 ke votes"
        },
        {
          "id": "who",
          "label": "Leader"
        }
      ],
      "steps": [
        {
          "title": "Heartbeat",
          "clock": "term 1",
          "say": "Leader (node 1, term 1) heartbeat bhejta hai. Followers ka timer har heartbeat par phir se shuru.",
          "nodes": {
            "n1": {
              "tone": "ok",
              "badge": "term 1"
            },
            "n2": {
              "tone": "idle",
              "badge": "timer 210"
            },
            "n3": {
              "tone": "idle",
              "badge": "timer 180"
            },
            "n4": {
              "tone": "idle",
              "badge": "timer 265"
            },
            "n5": {
              "tone": "idle",
              "badge": "timer 230"
            }
          },
          "vars": {
            "term": "1",
            "votes": "—",
            "who": "node 1"
          },
          "flows": [
            {
              "from": "n1",
              "to": "n2",
              "label": "",
              "tone": "ok"
            },
            {
              "from": "n1",
              "to": "n3",
              "label": "",
              "tone": "ok"
            },
            {
              "from": "n1",
              "to": "n4",
              "label": "",
              "tone": "ok"
            },
            {
              "from": "n1",
              "to": "n5",
              "label": "",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "Leader mara",
          "clock": "crash",
          "say": "Node 1 ki bijli gayi. Heartbeat band. Sabke timer chal rahe hain; node 3 ka sabse chhota (180 ms).",
          "nodes": {
            "n1": {
              "tone": "bad",
              "badge": "mara"
            },
            "n2": {
              "tone": "busy",
              "badge": "210…"
            },
            "n3": {
              "tone": "acc",
              "badge": "180 — pehla"
            },
            "n4": {
              "tone": "busy",
              "badge": "265…"
            },
            "n5": {
              "tone": "busy",
              "badge": "230…"
            }
          },
          "vars": {
            "term": "1",
            "votes": "—",
            "who": "koi nahi"
          },
          "ask": {
            "q": "Timeout sabka alag-alag (random) kyun hai?",
            "choices": [
              "Sab ek saath khade hon toh vote bant'te; random ek ko aage karta",
              "Random timer se network ka traffic barabar baant'ta hai saare nodes mein",
              "Random timer se purana leader jaldi wapas aa jaata hai"
            ],
            "answer": 0,
            "hint": "Agar sabka timer theek 200 ms ho toh 200 ms par kya hoga?",
            "explain": "Same timer par chaaron ek saath candidate bante, har ek khud ko vote deta, kisi ko majority nahi (split vote), phir sab dobara. Lab 59 ex1 (model): bilkul same timeout par 10,000 mein se ek bhi election nahi jeeta; 150–300 ms par sirf 2.2% mein split vote.",
            "choiceExplanations": [
              "Same timer par chaaron ek saath candidate bante, har ek khud ko vote deta, kisi ko majority nahi (split vote), phir sab dobara. Lab 59 ex1 (model): bilkul same timeout par 10,000 mein se ek bhi election nahi jeeta; 150–300 ms par sirf 2.2% mein split vote.",
              "Heartbeat leader bhejta hai; followers ke timers traffic nahi baant'te.",
              "Purana leader mara hai; followers ka timer leader ka wapas aana tay nahi karta."
            ]
          }
        },
        {
          "title": "Candidate",
          "clock": "term 2",
          "say": "Node 3 ka timer pehle baja. Node 3: term 1 → 2, khud ko vote, sabko RequestVote (\"term 2 mein mujhe vote do\").",
          "nodes": {
            "n1": {
              "tone": "bad",
              "badge": "mara"
            },
            "n2": {
              "tone": "busy",
              "badge": "request mili"
            },
            "n3": {
              "tone": "acc",
              "badge": "candidate, term 2"
            },
            "n4": {
              "tone": "busy",
              "badge": "request mili"
            },
            "n5": {
              "tone": "busy",
              "badge": "request mili"
            }
          },
          "vars": {
            "term": "2",
            "votes": "1 (khud)",
            "who": "?"
          },
          "flows": [
            {
              "from": "n3",
              "to": "n2",
              "label": "",
              "tone": "acc"
            },
            {
              "from": "n3",
              "to": "n4",
              "label": "",
              "tone": "acc"
            },
            {
              "from": "n3",
              "to": "n5",
              "label": "",
              "tone": "acc"
            }
          ]
        },
        {
          "title": "Votes",
          "clock": "votes",
          "say": "Nodes 2, 4, 5 ne term 2 mein abhi kisi ko vote nahi diya, aur node 3 ka log teeno ke log jitna naya hai — teeno haan.",
          "nodes": {
            "n1": {
              "tone": "bad",
              "badge": "mara"
            },
            "n2": {
              "tone": "ok",
              "badge": "haan"
            },
            "n3": {
              "tone": "ok",
              "badge": "4 votes"
            },
            "n4": {
              "tone": "ok",
              "badge": "haan"
            },
            "n5": {
              "tone": "ok",
              "badge": "haan"
            }
          },
          "vars": {
            "term": "2",
            "votes": "4 of 5",
            "who": "node 3"
          },
          "ask": {
            "q": "5 mein se 3 votes kaafi kyun hain, aur 2 kyun nahi?",
            "choices": [
              "Do majorities ka common voter ek term mein ek hi vote deta hai",
              "3 ek prime number hai, isliye votes gin'ne mein galti nahi hoti",
              "2 votes mein network ka bojh kam hota, par 3 mein election tez hota hai"
            ],
            "answer": 0,
            "hint": "Ek term mein do candidates dono 3-3 votes le sakte hain kya, agar sirf 5 voters hain?",
            "explain": "3 + 3 = 6 > 5, toh do majorities mein kam se kam ek voter common hai. Common voter ek term mein ek hi vote deta hai, isliye ek term mein ek hi leader. Lab 59 ex0 ne 3 se 7 nodes tak har subset gin kar dekha: majorities hamesha milti hain; \"aadha\" (N/2) quorum par do alag gut ban sakte hain.",
            "choiceExplanations": [
              "3 + 3 = 6 > 5, toh do majorities mein kam se kam ek voter common hai. Common voter ek term mein ek hi vote deta hai, isliye ek term mein ek hi leader. Lab 59 ex0 ne 3 se 7 nodes tak har subset gin kar dekha: majorities hamesha milti hain; \"aadha\" (N/2) quorum par do alag gut ban sakte hain.",
              "Prime hone se kuch nahi hota; 4 of 7 bhi majority hai.",
              "Majority ka niyam safety ke liye hai; election ki raftaar timers se aati hai."
            ]
          }
        },
        {
          "title": "Naya leader",
          "clock": "leader",
          "say": "Node 3 term 2 ka leader. Heartbeat shuru. Term 1 ka koi purana message aaye toh node message thukra deta hai: chhota term = purani khabar.",
          "nodes": {
            "n1": {
              "tone": "idle",
              "badge": "band"
            },
            "n2": {
              "tone": "ok",
              "badge": "follower"
            },
            "n3": {
              "tone": "ok",
              "badge": "leader, term 2"
            },
            "n4": {
              "tone": "ok",
              "badge": "follower"
            },
            "n5": {
              "tone": "ok",
              "badge": "follower"
            }
          },
          "vars": {
            "term": "2",
            "votes": "4 of 5",
            "who": "node 3"
          },
          "flows": [
            {
              "from": "n3",
              "to": "n2",
              "label": "",
              "tone": "ok"
            },
            {
              "from": "n3",
              "to": "n4",
              "label": "",
              "tone": "ok"
            },
            {
              "from": "n3",
              "to": "n5",
              "label": "",
              "tone": "ok"
            }
          ]
        }
      ],
      "lesson": "Leader heartbeat bhejta hai; random timer ek follower ko pehle candidate banata hai; term ek logical ghadi hai; majority votes se ek term mein ek hi leader. Ghadi (wall clock) ki zaroorat nahi, sirf term ki."
    },
    {
      "type": "cards",
      "title": "🔢 3, 4 ya 5 nodes?",
      "goal": "Lab 59 ex0: quorum ka asli hisaab (har subset), availability (maan kar ki nodes alag-alag fail hote hain) aur commit latency ka model.",
      "lesson": "Majority = N/2 + 1 (neeche round). 3 aur 4 dono ek failure sahte hain, par 4 ke paas toot'ne wali cheezein zyada hain — isliye 4 ka chalne ka chance 3 se kam. Odd N chuno.",
      "steps": [
        {
          "title": "1. Kitne down sah sakte hain",
          "say": "3 nodes: majority 2, ek down sah sakta hai. 4 nodes: majority 3, phir bhi ek. 5: majority 3, do. 7: majority 4, teen.",
          "ask": {
            "q": "Video kehta hai 4 nodes \"3 jitne safe, bas mehnge\". Lab ke hisaab se?",
            "choices": [
              "3 se bhi bura: 5% failure par 4 nodes 98.6%, 3 nodes 99.3%",
              "Sahi — 4 aur 3 ka chalne ka chance bilkul barabar hai",
              "4 behtar — ek node zyada hai toh chance bhi zyada"
            ],
            "answer": 0,
            "hint": "4 nodes mein majority ke liye kitne zinda chahiye, aur 3 mein?",
            "explain": "Dono ek failure sahte hain, par 4 mein 3 zinda chahiye (4 mein se), 3 mein 2 (3 mein se). Zyada nodes = do nodes ek saath girne ke zyada tareeke. Lab 59 ex0: p = 5% par 3 nodes 99.275%, 4 nodes 98.598%; 6 nodes bhi 5 se kam. Isliye 3, 5, 7.",
            "choiceExplanations": [
              "Dono ek failure sahte hain, par 4 mein 3 zinda chahiye (4 mein se), 3 mein 2 (3 mein se). Zyada nodes = do nodes ek saath girne ke zyada tareeke. Lab 59 ex0: p = 5% par 3 nodes 99.275%, 4 nodes 98.598%; 6 nodes bhi 5 se kam. Isliye 3, 5, 7.",
              "Hisaab mein farq hai: 99.275% vs 98.598% (p = 5%).",
              "Ek node zyada hone se majority bhi badhti hai (3 of 4)."
            ]
          }
        },
        {
          "title": "2. Commit kis ack ka intezaar karta hai?",
          "say": "Leader ka commit majority ke liye zaroori ack aate hi hota hai, sabse dheeme follower ka nahi. Model: 4 nodes sabse dheema (3 mein se 2 acks chahiye); 5 aur 7 ka p99 is model mein 3 se kam — par model leader ka zyada messages bhejna, bandwidth aur disk nahi ginta."
        },
        {
          "title": "3. Video ki baatein, sudhaar ke saath",
          "say": "Raft: Stanford, Ongaro & Ousterhout (USENIX ATC 2014). Raft crash-<b>recovery</b> maanta hai — node restart par disk se term, vote aur log padhta hai (video \"crash-stop\" kehta hai). Jhooth bolne wale nodes (Byzantine) Raft ke daayre se bahar."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Quorum ka hisaab",
      "project": "59-consensus",
      "exercise": "ex0-quorum",
      "goal": "Majority overlap (har subset gina), odd vs even N par chalne ka chance, aur commit latency ka model.",
      "why": "Node 24+ chahiye. Ginti aur model seeded hain, har run same. Asli Raft processes: lab 09.",
      "steps": [
        {
          "text": "Lab folder se chalao.",
          "cmd": "cd docker-labs/59-consensus && npm start -- ex0-quorum",
          "expect": "A. Quorum = majority. Kya do quorums hamesha kam se kam ek voter share karte hain? (har subset gina)\n\nN   majority   kitne down sah sakta   majority overlap   \"aadha\" (N/2) quorum overlap\n3      2              1                 haan, hamesha        NAHI — do alag 1-1 gut, do leader\n4      3              1                 haan, hamesha        NAHI — do alag 2-2 gut, do leader\n5      3              2                 haan, hamesha        NAHI — do alag 2-2 gut, do leader\n6      4              2                 haan, hamesha        NAHI — do alag 3-3 gut, do leader\n7      4              3                 haan, hamesha        NAHI — do alag 3-3 gut, do leader\n\nB. Har node alag-alag p waqt band ho (independent). Majority milne ka chance:\n\nN    p = 1%      p = 5%      p = 10%\n3   99.970%     99.275%     97.200%\n4   99.941%     98.598%     94.770%\n5   99.999%     99.884%     99.144%\n6   99.998%     99.777%     98.415%\n7  100.000%     99.981%     99.727%\n\n→ 4 nodes, 3 se KAM chalte hain (3 ki jagah 3 of 4 chahiye: zyada nodes, zyada cheezein toot sakti hain). 6 bhi 5 se kam.\n\nC. MODEL: commit kab? Leader + followers; har follower ka ack 0.5 ms + random (ausat 0.3 ms), 2% baar 20 ms ka\n   jhatka (GC, queue). Leader khud ek vote; commit = majority ke liye zaroori ack aate hi. 1 lakh commits per N.\n\nN   kitne follower acks chahiye   median     p99\n3   1 of 2                         0.61 ms    1.26 ms\n4   2 of 3                         0.71 ms    1.47 ms\n5   2 of 4                         0.65 ms    1.12 ms\n7   3 of 6                         0.67 ms    1.06 ms\n\n→ Commit sabse dheeme follower ka nahi, zaroori ginti wale ack ka intezaar karta hai. 4 nodes sabse dheema (2 of 3).\n  5 aur 7 ka p99 is model mein 3 se kam: zyada followers mein se tez wale mil jaate hain. Model leader ka zyada messages\n  bhejne ka kaam, bandwidth aur disk nahi ginta — asli cluster mein bade N ki keemat alag se naapo."
        },
        {
          "text": "Lab ke 5 tests.",
          "cmd": "npm test",
          "expect": "✔ quorum: majorities always overlap; N/2 groups can be disjoint; odd N beats the next even N (5.652821ms)\n✔ elections: identical timeouts never elect; a 150–300 ms range rarely splits (107.191474ms)\n✔ election restriction: without it a committed entry is lost about half the time; with it never (6.906776ms)\n✔ reads: a cut-off leader serving locally returns old data; ReadIndex refuses; a lease is safe only while clocks behave (0.304685ms)\n✔ price: a commit waits for the leader fsync AND the faster follower (RTT + fsync) (0.105664ms)\nℹ tests 5\nℹ suites 0\nℹ pass 5\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0\nℹ duration_ms 161.489217"
        }
      ],
      "observe": {
        "q": "Hisse A mein \"aadha\" (N/2) quorum par do alag gut kyun ban gaye?",
        "choices": [
          "N/2 + N/2 = N: do gut bina koi voter share kiye poore cluster ko baant sakte hain",
          "N/2 quorum mein network zyada busy hota hai, isliye messages kho jaate hain",
          "Odd N par N/2 hi majority hai, isliye odd N par gut nahi bante"
        ],
        "answer": 0,
        "hint": "4 nodes ko 2 + 2 mein baanto. Koi voter dono taraf hai?",
        "explain": "Quorum N/2 ho toh do alag gut (jaise {1,2} aur {3,4}) dono quorum hain aur koi voter common nahi — dono apna leader chun lenge: split brain. Majority (N/2 + 1) par do guton ka jod N se bada, toh overlap pakka.",
        "choiceExplanations": [
          "Quorum N/2 ho toh do alag gut (jaise {1,2} aur {3,4}) dono quorum hain aur koi voter common nahi — dono apna leader chun lenge: split brain. Majority (N/2 + 1) par do guton ka jod N se bada, toh overlap pakka.",
          "Quorum ka size messages nahi, overlap tay karta hai.",
          "Odd N par bhi N/2 (neeche round) majority se chhota hai: 5 par 2."
        ]
      },
      "lesson": "Majority isliye ki do majorities hamesha milti hain. Odd N chuno: even N utni hi failure sahta hai par kam chalta hai."
    }
  ],
  "interview": {
    "title": "Interview Round — election",
    "instructions": "Pehle socho: kitne votes chahiye, aur do candidates ek saath jeet sakte hain kya? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Team etcd ke 4 nodes chalana chahti hai \"taaki ek extra backup rahe\". Tumhari salah?",
        "choices": [
          "3 ya 5 — 4 bhi ek hi failure sahta, aur kam chalta hai",
          "4 theek hai — har extra node availability badhaata hai",
          "2 rakho — kam nodes, kam latency, aur ek backup phir bhi hai",
          "6 rakho — even number par votes barabar bant'te hain"
        ],
        "answer": 0,
        "explain": "4 nodes ki majority 3 hai, toh failure ek hi sah sakta hai — 3 jitna. Upar se do nodes ek saath girne ke tareeke zyada: lab 59 ex0 mein p = 5% par 98.6% vs 3 nodes 99.3%. Zyada failure sahne ke liye 5 (do failures).",
        "choiceExplanations": [
          "4 nodes ki majority 3 hai, toh failure ek hi sah sakta hai — 3 jitna. Upar se do nodes ek saath girne ke tareeke zyada: lab 59 ex0 mein p = 5% par 98.6% vs 3 nodes 99.3%. Zyada failure sahne ke liye 5 (do failures).",
          "4 ki majority 3 hai; extra node ne failure sahne ki ginti nahi badhaai.",
          "2 nodes ki majority 2 hai: ek gira toh band — koi failure nahi sahta.",
          "6 ki majority 4: do hi failure sahta (5 jitna), aur ex0 mein 6 nodes 5 se kam chalte."
        ]
      },
      {
        "q": "Election ke baad ek node ko term 7 ka message mila, jabki node khud term 9 mein hai. Kya kare?",
        "choices": [
          "Thukra do — term 7 purani khabar; jawab mein term 9 batao",
          "Message maan lo — message jitna purana, utna bharosemand",
          "Apna term 7 kar lo aur message wale ko leader maan lo",
          "Election shuru karo — do terms ka matlab cluster toota hai"
        ],
        "answer": 0,
        "explain": "Term ek logical ghadi hai. Chhote term ka message kisi purane leader ka hai jise pata hi nahi ki naya leader chuna ja chuka. Raft mein node purana term dekh kar message thukra deta hai aur jawab mein apna bada term bhejta hai; bhejne wala bada term dekh kar follower ban jaata hai.",
        "choiceExplanations": [
          "Term ek logical ghadi hai. Chhote term ka message kisi purane leader ka hai jise pata hi nahi ki naya leader chuna ja chuka. Raft mein node purana term dekh kar message thukra deta hai aur jawab mein apna bada term bhejta hai; bhejne wala bada term dekh kar follower ban jaata hai.",
          "Purana message purane leader ka hai; purane leader ki baat maanna split brain hai.",
          "Term kabhi peeche nahi jaata; peeche jaana do leaders ki jagah banata hai.",
          "Purana message milna election ka kaaran nahi; bas thukra do."
        ]
      }
    ]
  },
  "success": [
    "Heartbeat, timeout, term aur votes se election samjha sakte ho",
    "Majority overlap ka hisaab bata sakte ho",
    "Odd N kyun, numbers se samjha sakte ho"
  ],
  "cards": [
    {
      "front": "Raft election ke kadam?",
      "back": "Heartbeat band → random timeout → candidate: term +1, khud ko vote, RequestVote → majority mili toh leader → heartbeat. Bada term dikhe toh follower."
    },
    {
      "front": "Majority kyun?",
      "back": "Do majorities hamesha ek voter share karti hain (lab 59 ex0: har subset gina). Common voter ek term mein ek vote deta hai → ek term, ek leader."
    },
    {
      "front": "4 nodes vs 3?",
      "back": "Dono ek failure sahte hain, par 4 ka chalne ka chance kam: lab 59 ex0, p = 5%: 3 nodes 99.275%, 4 nodes 98.598%. Odd N chuno."
    }
  ]
}
]);
})();
