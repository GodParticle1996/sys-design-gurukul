/* First Principles — FAANG Senior Engineer.
   Source credit: Distributed Consensus & Raft (xU-7JxwUpLo), numbered video 9/15.
   Evidence: docker-labs/59-consensus/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "client", "icon": "📱", "label": "Client", "x": 150, "y": 70}, {"id": "old", "icon": "👑", "label": "Node 1 (purana leader)", "x": 450, "y": 70}, {"id": "n2", "icon": "🗄️", "label": "Node 2", "x": 450, "y": 300}, {"id": "big", "icon": "🗄️", "label": "Nodes 3, 4, 5", "x": 760, "y": 190}];
const EDGES = [{"from": "client", "to": "old"}, {"from": "old", "to": "n2"}, {"from": "old", "to": "big"}];
VISUALS["fp-raft-kab"] = { t: "Kata hua purana leader apni copy se padhe toh purana jawab. ReadIndex ya lease leadership pakki karte hain.", html: SD.viz.svg(HERO, EDGES, { nodes: { client: {tone:'acc',badge:'read'}, old: {tone:'bad',badge:'purana'}, n2: {tone:'idle',badge:''}, big: {tone:'ok',badge:'naya leader'} } }, {w:900,h:380}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-raft-kab",
  "icon": "🗝️",
  "group": "🗳️ Consensus & Raft",
  "title": "Raft 4 · Kab — reads, keemat, aur raaj ki chaabiyan",
  "badge": "Chaabi Ka Rakhwala",
  "objectives": [
    "Kata hua purana leader se read kyun galat ho sakta hai",
    "ReadIndex vs lease: keemat aur bharosa",
    "Consensus kis data ke liye, aur scale kaise"
  ],
  "lesson": [
    "<h3>🏛️ Purana raja, naya farmaan</h3><p>Raja jungle mein bhatak gaya. Mahal mein naya raja ban gaya aur naye farmaan nikle. Jungle mein ek seth purane raja se poochta hai \"lagaan kitna hai?\" — purana raja purana lagaan batata hai. Raja ne jhooth nahi bola; purane raja ko pata hi nahi.</p><p>Raft ka log sahi ho tab bhi read galat ho sakta hai. Aaj dekhte hain galat read rokne ke do raaste, aur consensus kab lagaana chahiye.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "📖 Log sahi, phir bhi read galat?",
      "goal": "Lab 59 ex4 (model, timeline). t = 1000 ms par network kata: {1, 2} | {3, 4, 5}. Badi taraf t = 1300 par naya leader chunti hai aur har 50 ms naya version commit karti hai. Purane leader 1 ke paas wala client t = 1000–3000 har 10 ms padhta hai (200 reads).",
      "nodes": [
        {
          "id": "client",
          "icon": "📱",
          "label": "Client",
          "x": 150,
          "y": 70
        },
        {
          "id": "old",
          "icon": "👑",
          "label": "Node 1 (purana leader)",
          "x": 450,
          "y": 70
        },
        {
          "id": "n2",
          "icon": "🗄️",
          "label": "Node 2",
          "x": 450,
          "y": 300
        },
        {
          "id": "big",
          "icon": "🗄️",
          "label": "Nodes 3, 4, 5",
          "x": 760,
          "y": 190
        }
      ],
      "edges": [
        {
          "from": "client",
          "to": "old"
        },
        {
          "from": "old",
          "to": "n2"
        },
        {
          "from": "old",
          "to": "big"
        }
      ],
      "viz": {
        "w": 900,
        "h": 380
      },
      "vars": [
        {
          "id": "rule",
          "label": "Padhne ka niyam"
        },
        {
          "id": "served",
          "label": "Jawab diye"
        },
        {
          "id": "stale",
          "label": "Purana version"
        }
      ],
      "steps": [
        {
          "title": "Local read",
          "clock": "local",
          "say": "Node 1 khud ko leader maanta hai (term 2 ki khabar nahi) aur apni copy se jawab deta hai.",
          "nodes": {
            "client": {
              "tone": "acc",
              "badge": "read"
            },
            "old": {
              "tone": "bad",
              "badge": "apni copy (v0)"
            },
            "n2": {
              "tone": "idle",
              "badge": ""
            },
            "big": {
              "tone": "ok",
              "badge": "naya leader, v1, v2, …"
            }
          },
          "vars": {
            "rule": "local",
            "served": "200",
            "stale": "170"
          },
          "flows": [
            {
              "from": "client",
              "to": "old",
              "label": "read",
              "tone": "acc"
            }
          ],
          "ask": {
            "q": "Log Raft se sahi hai. Phir 170 reads purane kyun?",
            "choices": [
              "Naya leader likh raha hai; purane leader ki copy purani",
              "Raft ka log purane leader par corrupt ho gaya tha",
              "Client ne galat key padhi thi, version nahi"
            ],
            "answer": 0,
            "hint": "t = 1300 ke baad naye versions kahan likhe ja rahe hain?",
            "explain": "Log ke kram ki safety ka matlab nahi ki har node har pal sabse naya jaanta hai. Kata hua purana leader apni copy se padhta hai — badi taraf ka naya leader t = 1300 se naye versions commit kar raha hai. 1300–3000 ke 170 reads purane. Purane reads rokne ke do raaste Raft paper §8 mein hain: majority se heartbeat (Ongaro ki thesis §6.4 mein naam ReadIndex) aur lease.",
            "choiceExplanations": [
              "Log ke kram ki safety ka matlab nahi ki har node har pal sabse naya jaanta hai. Kata hua purana leader apni copy se padhta hai — badi taraf ka naya leader t = 1300 se naye versions commit kar raha hai. 1300–3000 ke 170 reads purane. Purane reads rokne ke do raaste Raft paper §8 mein hain: majority se heartbeat (Ongaro ki thesis §6.4 mein naam ReadIndex) aur lease.",
              "Purane leader ka log theek hai, bas purana; corrupt nahi.",
              "Key sahi thi; version purana tha."
            ]
          }
        },
        {
          "title": "ReadIndex",
          "clock": "readindex",
          "say": "Har read se pehle leader majority se heartbeat ka jawab maangta hai: \"kya main ab bhi leader hoon?\" Node 1 sirf node 2 tak pahunchta hai — majority nahi.",
          "nodes": {
            "client": {
              "tone": "bad",
              "badge": "error"
            },
            "old": {
              "tone": "busy",
              "badge": "majority?"
            },
            "n2": {
              "tone": "busy",
              "badge": "haan"
            },
            "big": {
              "tone": "idle",
              "badge": "pahunch nahi"
            }
          },
          "vars": {
            "rule": "ReadIndex",
            "served": "0",
            "stale": "0 (200 mana)"
          },
          "flows": [
            {
              "from": "old",
              "to": "n2",
              "label": "heartbeat",
              "tone": "busy"
            }
          ]
        },
        {
          "title": "Lease",
          "clock": "lease",
          "say": "Leader majority ke aakhri ack ke baad 200 ms tak bina pooche padhta hai. Naya leader 300 ms (election timeout) se pehle nahi ban sakta, toh lease khatam hone ke baad hi naya leader.",
          "nodes": {
            "client": {
              "tone": "ok",
              "badge": "20 jawab"
            },
            "old": {
              "tone": "ok",
              "badge": "lease 1000–1200"
            },
            "n2": {
              "tone": "idle",
              "badge": ""
            },
            "big": {
              "tone": "ok",
              "badge": "leader 1300 se"
            }
          },
          "vars": {
            "rule": "lease 200 ms",
            "served": "20",
            "stale": "0"
          },
          "ask": {
            "q": "Lease kis cheez par bharosa karti hai?",
            "choices": [
              "Ghadiyon par: sabki ghadi lagbhag barabar chale",
              "Network par: koi packet kabhi na khoye, kabhi bhi",
              "Disk par: har read par fsync ho"
            ],
            "answer": 0,
            "hint": "Purane leader ki ghadi 2× dheemi ho toh purane leader ke liye 200 ms kab khatam hoga?",
            "explain": "Lease ka vaada samay ka hai: \"main 200 ms tak leader hoon, kyunki 300 ms se pehle koi aur nahi ban sakta\". Lease ka vaada tabhi sach jab ghadiyon ka farq seema mein ho. Lab: ghadi 2× dheemi → lease asal mein 400 ms → 10 purane reads.",
            "choiceExplanations": [
              "Lease ka vaada samay ka hai: \"main 200 ms tak leader hoon, kyunki 300 ms se pehle koi aur nahi ban sakta\". Lease ka vaada tabhi sach jab ghadiyon ka farq seema mein ho. Lab: ghadi 2× dheemi → lease asal mein 400 ms → 10 purane reads.",
              "Lease packet loss par nahi, samay par tiki hai.",
              "Read ke liye fsync nahi chahiye; lease ka sawaal samay ka hai."
            ]
          }
        },
        {
          "title": "Dheemi ghadi",
          "clock": "slow clock",
          "say": "Purane leader ki ghadi 2× dheemi. Purane leader ko lagta hai 200 ms hue, asal mein 400. t = 1300–1400 ke reads naye leader ke baad bhi purani copy se.",
          "nodes": {
            "client": {
              "tone": "bad",
              "badge": "10 purane"
            },
            "old": {
              "tone": "bad",
              "badge": "lease \"valid\" 1400 tak"
            },
            "n2": {
              "tone": "idle",
              "badge": ""
            },
            "big": {
              "tone": "ok",
              "badge": "leader 1300 se"
            }
          },
          "vars": {
            "rule": "lease + dheemi ghadi",
            "served": "40",
            "stale": "10"
          }
        }
      ],
      "lesson": "Raft ka log kram pakka karta hai; linearizable read ke liye leader ko apni leadership pakki karni padti hai — ReadIndex (har read par ek round trip) ya lease (ghadiyon par bharosa)."
    },
    {
      "type": "cards",
      "title": "🗝️ Consensus kahan lagaayein",
      "goal": "Video: consensus \"raaj ki chaabiyon\" ke liye, har cheez ke liye nahi. Lab 59 ex2 (asli fsync + model RTT) se keemat.",
      "lesson": "Consensus har commit par fsync + round trip leta hai aur ek group ke saare writes ek leader se guzarte hain. Isliye chhota, zaroori metadata Raft mein; bada traffic sharding (kai groups) ya eventual patterns se.",
      "steps": [
        {
          "title": "1. Kaunsa data",
          "say": "<b>Raft/Paxos ke liye:</b> kaun leader hai, kis shard ka maalik kaun, config, feature flags, locks/leases. <b>Nahi:</b> user comments, clicks, logs — inke liye CAP level ke AP patterns. Keemat (lab 59 ex2): ek commit same AZ ~1.6 ms, regions ~61 ms; batching se throughput badhta hai.",
          "ask": {
            "q": "Team har user comment ko ek 5-node etcd cluster mein likhna chahti hai \"taaki kuch na khoye\". Tumhari salah?",
            "choices": [
              "Comments ko normal replicated DB ya sharded store mein; etcd metadata ke liye",
              "Theek hai — etcd strong consistent hai, toh comments ke liye bhi behtar",
              "etcd ko 50 nodes ka kar do, phir comments ka load sambhal lega"
            ],
            "answer": 0,
            "hint": "Ek Raft group ke saare writes kahan se guzarte hain?",
            "explain": "Ek Raft group = ek leader, har write fsync + majority round trip. etcd chhote, zaroori data ke liye bana hai (default request size 1.5 MiB, storage quota 2 GB). Comments jaise bhaari traffic ke liye sharded store (kai groups) ya replicated DB. Nodes badhaane se har commit mein zyada acks.",
            "choiceExplanations": [
              "Ek Raft group = ek leader, har write fsync + majority round trip. etcd chhote, zaroori data ke liye bana hai (default request size 1.5 MiB, storage quota 2 GB). Comments jaise bhaari traffic ke liye sharded store (kai groups) ya replicated DB. Nodes badhaane se har commit mein zyada acks.",
              "Strong consistency ki keemat har write par latency; comments ko itni zaroorat nahi.",
              "Zyada nodes = zyada acks per commit; throughput nahi badhta."
            ]
          }
        },
        {
          "title": "2. Asli systems",
          "say": "<b>etcd</b> (Raft): Kubernetes ka control-plane store. etcd ki majority gayi toh Kubernetes naye badlaav (deploy, scale) nahi kar paata; chalte pods aam taur par chalte rehte hain. <b>ZooKeeper</b> (Zab). <b>Kafka</b>: 4.0 (2025) se sirf KRaft, ZooKeeper hata. <b>Spanner</b>: har shard ek Paxos group."
        },
        {
          "title": "3. Kai groups = scale",
          "say": "Ek Raft group ki seema ek leader hai. Bade systems data ko shards mein baant kar har shard ka apna Raft/Paxos group rakhte hain (Spanner, CockroachDB). Har group chhota, sab saath milkar bada — FP7 (sharding) aur FP9 ka jod."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Kata hua leader aur reads",
      "project": "59-consensus",
      "exercise": "ex4-reads",
      "goal": "Purana leader chhoti taraf; local read, ReadIndex, lease, aur dheemi ghadi wala lease — 200 reads par.",
      "why": "Node 24+ chahiye. Model timeline hai, har run same.",
      "steps": [
        {
          "text": "Lab folder se: reads.",
          "cmd": "cd docker-labs/59-consensus && npm start -- ex4-reads",
          "expect": "padhne ka niyam                                  jawab diye   purana version   mana\nlocal read (apni copy se)                         200          170             0\nReadIndex (pehle majority se pucho)                 0            0           200\nlease 200 ms (election 300 ms se chhota)           20            0           180\nlease, par purane leader ki ghadi 2× dheemi        40           10           160\n\nlocal read: purana leader jaanta hi nahi ki naya leader aa gaya → 170 reads mein purana version (Raft log sahi hai, read galat).\nReadIndex: har read se pehle majority se heartbeat ka jawab chahiye → chhoti taraf mana karti hai; sehatmand leader par\n  har read ki keemat ek round trip.\nLease: majority ka aakhri ack + 200 ms tak bina pooche padho; naya leader 300 ms se pehle nahi ban sakta → safe, BASHARTE\n  ghadiyon ka farq seema mein ho. Ghadi 2× dheemi → lease 400 ms tak \"valid\" lagi → naye leader ke baad bhi purana jawab."
        },
        {
          "text": "Lab ke tests.",
          "cmd": "npm test",
          "expect": "✔ quorum: majorities always overlap; N/2 groups can be disjoint; odd N beats the next even N (5.652821ms)\n✔ elections: identical timeouts never elect; a 150–300 ms range rarely splits (107.191474ms)\n✔ election restriction: without it a committed entry is lost about half the time; with it never (6.906776ms)\n✔ reads: a cut-off leader serving locally returns old data; ReadIndex refuses; a lease is safe only while clocks behave (0.304685ms)\n✔ price: a commit waits for the leader fsync AND the faster follower (RTT + fsync) (0.105664ms)\nℹ tests 5\nℹ suites 0\nℹ pass 5\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0\nℹ duration_ms 161.489217"
        }
      ],
      "observe": {
        "q": "ReadIndex ne chhoti taraf ke saare 200 reads mana kiye. Sehatmand cluster mein ReadIndex ki keemat kya hai?",
        "choices": [
          "Har read par majority se ek round trip",
          "Har read par fsync — disk par bojh badhta hai",
          "Koi keemat nahi — ReadIndex hamesha muft hai"
        ],
        "answer": 0,
        "hint": "ReadIndex padhne se pehle kya pakka karta hai?",
        "explain": "ReadIndex har read se pehle majority se \"kya main leader hoon?\" poochhta hai: ek round trip (same AZ ~0.5 ms, regions ~60 ms). Isliye lease ek sasta raasta hai — par ghadiyon ke bharose. Shart: naya leader pehle apne term ki ek khaali (no-op) entry commit karta hai. Kuch systems followers se bhi padhte hain, leader se commit index lekar.",
        "choiceExplanations": [
          "ReadIndex har read se pehle majority se \"kya main leader hoon?\" poochhta hai: ek round trip (same AZ ~0.5 ms, regions ~60 ms). Isliye lease ek sasta raasta hai — par ghadiyon ke bharose. Shart: naya leader pehle apne term ki ek khaali (no-op) entry commit karta hai. Kuch systems followers se bhi padhte hain, leader se commit index lekar.",
          "Read ke liye log mein likhna nahi padta; fsync ki zaroorat nahi.",
          "Muft nahi: har read ek network round trip."
        ]
      },
      "lesson": "Linearizable read: ReadIndex (round trip) ya lease (ghadi). Consensus chhote, zaroori data ke liye; scale ke liye kai groups."
    }
  ],
  "interview": {
    "title": "Interview Round — consensus kab",
    "instructions": "Pehle socho: data kitna zaroori hai, kitna bada hai, aur read kitna taaza chahiye? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Config service (Raft) se ek feature flag padhna hai; galat flag se payments band ho sakte hain. Read kaise?",
        "choices": [
          "Leader se ReadIndex (ya safe lease), local copy nahi",
          "Kisi bhi follower se — Raft ka log hamesha sabke paas same hai",
          "Cache 1 ghante ke liye — config kabhi-kabhi hi badalta hai",
          "Client apni last value yaad rakhe, service se kabhi na poochhe"
        ],
        "answer": 0,
        "explain": "Raft log ka kram pakka hai, par follower ya kata hua purana leader peeche ho sakta hai (lab 59 ex4: local read par 170 purane). Zaroori flag ke liye leader ReadIndex se leadership pakki kare, ya lease jahan ghadiyon par bharosa ho.",
        "choiceExplanations": [
          "Raft log ka kram pakka hai, par follower ya kata hua purana leader peeche ho sakta hai (lab 59 ex4: local read par 170 purane). Zaroori flag ke liye leader ReadIndex se leadership pakki kare, ya lease jahan ghadiyon par bharosa ho.",
          "Followers peeche ho sakte hain; same log ka matlab same pal nahi.",
          "1 ghante ka cache = galat flag 1 ghante tak.",
          "Kabhi na poochhna = flag ka badlaav kabhi na dikhe."
        ]
      },
      {
        "q": "Kubernetes cluster ka etcd majority kho baitha (3 mein se 2 nodes band). Kya hoga?",
        "choices": [
          "Naye badlaav rukenge; chalte pods aam taur par chalenge",
          "Saare pods turant band ho jaayenge",
          "Kuch nahi — Kubernetes etcd ke bina bhi naye pods chala leta hai",
          "Ek bacha node apne aap naya leader banke chalta rahega"
        ],
        "answer": 0,
        "explain": "etcd control plane ka store hai: majority ke bina naye writes commit nahi hote, toh API server badlaav save nahi kar paata. Jo pods nodes par chal rahe hain, kubelet chalte pods ko chalata rehta hai. Video ka \"poora cluster freeze\" control plane ke liye sahi, chalte kaam ke liye nahi.",
        "choiceExplanations": [
          "etcd control plane ka store hai: majority ke bina naye writes commit nahi hote, toh API server badlaav save nahi kar paata. Jo pods nodes par chal rahe hain, kubelet chalte pods ko chalata rehta hai. Video ka \"poora cluster freeze\" control plane ke liye sahi, chalte kaam ke liye nahi.",
          "Chalte pods ko etcd har pal nahi chahiye; kubelet chalata hai.",
          "Naye badlaav etcd mein save hote hain; majority ke bina nahi.",
          "1 node 3 ki majority (2) nahi; leader nahi ban sakta."
        ]
      }
    ]
  },
  "success": [
    "Kata hua leader ka galat read samjha sakte ho",
    "ReadIndex vs lease chun sakte ho",
    "Consensus ke liye sahi data aur scale ka tareeka bata sakte ho"
  ],
  "cards": [
    {
      "front": "Raft linearizable read?",
      "back": "ReadIndex: har read se pehle majority se leadership pakki (ek round trip). Lease: election timeout se chhoti lease, ghadiyon par bharosa. Lab 59 ex4: local read 170 purane; ReadIndex 0; lease 0; dheemi ghadi wala lease 10."
    },
    {
      "front": "Consensus kis data ke liye?",
      "back": "Chhota, zaroori metadata: leader kaun, config, locks. Bada traffic nahi — har commit fsync + round trip (lab 59 ex2: same AZ ~1.6 ms, regions ~61 ms)."
    },
    {
      "front": "etcd majority gayi toh Kubernetes?",
      "back": "Naye badlaav ruk jaate hain (control plane); chalte pods aam taur par chalte rehte hain."
    }
  ]
}
]);
})();
