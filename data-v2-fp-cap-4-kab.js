/* First Principles — FAANG Senior Engineer.
   Source credit: CAP Theorem & PACELC (Ub9yZucpwC0), numbered video 8/15.
   Evidence: docker-labs/58-cap/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "big", "icon": "🗄️", "label": "Nodes 1, 2, 3", "x": 180, "y": 70}, {"id": "small", "icon": "🗄️", "label": "Nodes 4, 5 (purana leader 5)", "x": 620, "y": 70}, {"id": "store", "icon": "💾", "label": "Shared storage", "x": 400, "y": 340}];
const EDGES = [{"from": "big", "to": "store"}, {"from": "small", "to": "store"}];
VISUALS["fp-cap-kab"] = { t: "Bina quorum dono leaders commit karte hain. Quorum mein sirf majority wala commit karta hai; fencing token jaage purane leader ko storage par rokta hai.", html: SD.viz.svg(HERO, EDGES, { nodes: { big: {tone:'ok',badge:'leader (term 2)'}, small: {tone:'bad',badge:'zombie (term 1)'}, store: {tone:'ok',badge:'fencing'} } }, {w:900,h:410}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-cap-kab",
  "icon": "👑",
  "group": "🔀 CAP & PACELC",
  "title": "CAP 4 · Kab — CP kab, AP kab, aur split brain",
  "badge": "Raaj Ka Rakhwala",
  "objectives": [
    "Bina quorum do leaders kyun, aur quorum kya rokta hai",
    "Zombie leader aur fencing token",
    "Value data vs volume data: kab CP, kab AP"
  ],
  "lesson": [
    "<h3>👑 Do raja</h3><p>Raja jungle mein kho gaya. Mantri ne socha raja mar gaya, naya raja bana diya. Purana raja laut aaya, apni muhar se farmaan nikaalne laga. Ab do muhar, do farmaan — praja kiski maane?</p><p>Database mein do raja wali haalat ko split brain kehte hain. Aaj naapte hain: quorum aur fencing token kaunsa farmaan rokte hain, aur kis data ke liye kaunsa niyam.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "👑👑 Do raja, ek raaj — split brain",
      "goal": "Lab 58 ex5 (model, seeded). 5 nodes, purana leader node 5 chhoti taraf. Network {1,2,3} | {4,5}. 30 s mein 1,000 writes: 60% clients badi taraf, 40% chhoti taraf.",
      "nodes": [
        {
          "id": "big",
          "icon": "🗄️",
          "label": "Nodes 1, 2, 3",
          "x": 180,
          "y": 70
        },
        {
          "id": "small",
          "icon": "🗄️",
          "label": "Nodes 4, 5 (purana leader 5)",
          "x": 620,
          "y": 70
        },
        {
          "id": "store",
          "icon": "💾",
          "label": "Shared storage",
          "x": 400,
          "y": 340
        }
      ],
      "edges": [
        {
          "from": "big",
          "to": "store"
        },
        {
          "from": "small",
          "to": "store"
        }
      ],
      "viz": {
        "w": 900,
        "h": 410
      },
      "vars": [
        {
          "id": "leaders",
          "label": "Leaders"
        },
        {
          "id": "acked",
          "label": "\"Ho gaya\" bola"
        },
        {
          "id": "lost",
          "label": "Jodne par gayab"
        }
      ],
      "steps": [
        {
          "title": "Network toota",
          "clock": "split",
          "say": "Badi taraf ko leader 5 ki heartbeat nahi milti. Badi taraf naya leader chunti hai (term 2).",
          "nodes": {
            "big": {
              "tone": "acc",
              "badge": "naya leader?"
            },
            "small": {
              "tone": "busy",
              "badge": "leader 5 (term 1)"
            },
            "store": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "leaders": "?",
            "acked": "—",
            "lost": "—"
          }
        },
        {
          "title": "Bina quorum",
          "clock": "no quorum",
          "say": "Niyam: jo taraf leader na dekhe, khud leader chun le. Chhoti taraf mein leader 5 bhi chalta raha.",
          "nodes": {
            "big": {
              "tone": "bad",
              "badge": "leader 1"
            },
            "small": {
              "tone": "bad",
              "badge": "leader 5"
            },
            "store": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "leaders": "2",
            "acked": "1,000",
            "lost": "395"
          },
          "ask": {
            "q": "Network judne par chhoti taraf ke 395 writes ka kya hua?",
            "choices": [
              "Ek branch phenki gayi — \"ho gaya\" bole 395 writes gayab",
              "Dono branches apne aap jud gayi, kyunki dono leaders sahi the",
              "Writes bach gaye, bas thodi der se dikhe"
            ],
            "answer": 0,
            "hint": "Do leaders ne alag-alag history likhi. Ek history chunni padi toh doosri ka kya?",
            "explain": "Do leaders = do alag sach. Judne par ek history rakhni padti hai; lab mein chhoti taraf ke 395 writes phenke gaye — jinhe \"ho gaya\" bola gaya tha. Kuch systems branches ko CRDT ki tarah jod sakte hain, par aam leader-based database mein phenki branch = data loss.",
            "choiceExplanations": [
              "Do leaders = do alag sach. Judne par ek history rakhni padti hai; lab mein chhoti taraf ke 395 writes phenke gaye — jinhe \"ho gaya\" bola gaya tha. Kuch systems branches ko CRDT ki tarah jod sakte hain, par aam leader-based database mein phenki branch = data loss.",
              "Leader-based database do histories apne aap nahi jodta.",
              "Phenki gayi branch ke writes wapas nahi aate."
            ]
          }
        },
        {
          "title": "Majority quorum",
          "clock": "quorum",
          "say": "Niyam: leader banne aur commit ke liye 3 of 5. Badi taraf term 2 ka leader chunti hai. Node 5 ko term 2 ki khabar nahi, toh node 5 khud ko leader maan sakta hai — par 3 nodes tak na pahunchne se commit nahi kar sakta. Raft ek term mein ek hi leader deta hai; alag terms ke do \"leader\" ho sakte hain (lab 09 bhi dikhata hai).",
          "nodes": {
            "big": {
              "tone": "ok",
              "badge": "leader 1 (term 2)"
            },
            "small": {
              "tone": "bad",
              "badge": "mana"
            },
            "store": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "leaders": "commit: sirf 1 (5 khud ko leader maan sakta)",
            "acked": "605",
            "lost": "0 (395 mana)"
          }
        },
        {
          "title": "Zombie jaaga",
          "clock": "zombie",
          "say": "Node 5 asal mein GC pause mein atka tha. Jaag kar term 1 ke 50 queued writes storage ko bhejta hai. Naya leader term 2 par 100 likh chuka.",
          "nodes": {
            "big": {
              "tone": "ok",
              "badge": "term 2"
            },
            "small": {
              "tone": "bad",
              "badge": "term 1 jaaga"
            },
            "store": {
              "tone": "busy",
              "badge": "?"
            }
          },
          "vars": {
            "leaders": "commit: 1, zombie jaaga",
            "acked": "—",
            "lost": "?"
          },
          "flows": [
            {
              "from": "small",
              "to": "store",
              "label": "50 · t1",
              "tone": "bad"
            },
            {
              "from": "big",
              "to": "store",
              "label": "100 · t2",
              "tone": "ok"
            }
          ],
          "ask": {
            "q": "Storage bina kisi check ke dono ke writes maan le toh aakhri value?",
            "choices": [
              "Purane leader ki (old-49) — zombie ne naye leader ke baad likha",
              "Naye leader ki — storage apne aap term samajh leta hai",
              "Koi nahi — storage takraav par dono writes rok deta hai"
            ],
            "answer": 0,
            "hint": "Storage ko kaise pata ki kaun leader hai?",
            "explain": "Bina check ke storage har write maan leta hai; zombie ne baad mein likha, toh aakhri value purane leader ki (lab: old-49). Quorum ne purane leader ke naye commits roke, par zombie seedha storage se baat karta hai. Ilaaj: fencing token.",
            "choiceExplanations": [
              "Bina check ke storage har write maan leta hai; zombie ne baad mein likha, toh aakhri value purane leader ki (lab: old-49). Quorum ne purane leader ke naye commits roke, par zombie seedha storage se baat karta hai. Ilaaj: fencing token.",
              "Storage term tabhi dekhta hai jab storage ko term dekhne ka niyam diya ho.",
              "Lab ke storage ne dono ke saare writes maane (150)."
            ]
          }
        },
        {
          "title": "Fencing token",
          "clock": "fencing",
          "say": "Har write ke saath leader ka term. Storage ne term 2 dekh liya hai, toh term 1 ke writes thukraata hai.",
          "nodes": {
            "big": {
              "tone": "ok",
              "badge": "term 2"
            },
            "small": {
              "tone": "bad",
              "badge": "term 1"
            },
            "store": {
              "tone": "ok",
              "badge": "term ≥ 2 hi"
            }
          },
          "vars": {
            "leaders": "commit: 1",
            "acked": "100",
            "lost": "0 (50 thukraaye)"
          },
          "flows": [
            {
              "from": "small",
              "to": "store",
              "label": "term 1 ✗",
              "tone": "bad"
            },
            {
              "from": "big",
              "to": "store",
              "label": "term 2 ✓",
              "tone": "ok"
            }
          ]
        }
      ],
      "lesson": "Bina quorum ke do leaders = \"ho gaya\" bole gaye writes ka nuksaan. Majority quorum chhoti taraf ko mana karwata hai. Purane leader ke liye storage par fencing token chahiye."
    },
    {
      "type": "cards",
      "title": "🧭 Kab CP, kab AP?",
      "goal": "Video ka aakhri sawaal: kaunsa data kis tarah. Lab 58 ke numbers se.",
      "lesson": "Data dekho: paisa/stock (value) ya likes/views (volume)? User dekho: 10 s down = paisa gaya ya bas bore? Faisla har operation ka hai, poore system ka nahi. Aur \"sabse kamzor chalne wali consistency\" bhi naapo — reconciliation ka kharcha bhi hota hai.",
      "steps": [
        {
          "title": "1. Value data vs volume data",
          "say": "<b>Paisa, stock, seat booking:</b> galat jawab mehnga → partition mein mana (CP) ya ledger + seema (ex1: offline ₹20 se nuksaan ₹530). <b>Likes, views, logs:</b> purana count chalta hai → AP + CRDT (ex4: G-Counter ne 1,500 mein se 1,500 rakhe, LWW ne 1,200).",
          "ask": {
            "q": "Concert tickets: 10,000 seats, 1 lakh log. Seat booking ka niyam?",
            "choices": [
              "Seat hold CP; seat map AP (thoda purana chalega)",
              "Sab AP — baad mein dohri bookings refund kar denge",
              "Sab CP — seat map bhi har baar majority se padhna"
            ],
            "answer": 0,
            "hint": "Kis cheez ka galat hona mehnga hai: seat map ka thoda purana dikhna, ya ek seat do logon ko?",
            "explain": "Ek seat do logon ko = asli nuksaan (refund, gussa) → hold CP. Seat map 2 s purana dikhe toh user bas doosri seat chunta hai → AP chalega. Ek hi app mein dono faisle — CAP har operation ka hai.",
            "choiceExplanations": [
              "Ek seat do logon ko = asli nuksaan (refund, gussa) → hold CP. Seat map 2 s purana dikhe toh user bas doosri seat chunta hai → AP chalega. Ek hi app mein dono faisle — CAP har operation ka hai.",
              "Dohri booking ka refund paisa aur bharosa dono khota hai.",
              "Seat map ko CP rakhne se peak par har view mehnga aur partition mein band."
            ]
          }
        },
        {
          "title": "2. Five nines ka hisaab",
          "say": "365.25 din ke saal mein service-downtime budget: 99.9% par 8 h 45 min 57.6 s; 99.99% par 52 min 35.8 s; 99.999% par <b>5 min 15.6 s</b> (365 din ke saal mein 5 min 15.36 s). Five nines service downtime ka budget hai: ek replica ka reboot service band kare zaroori nahi. CAP ka \"A\" alag cheez hai — har zinda node ka jawab."
        },
        {
          "title": "3. Global strong consistency mumkin hai",
          "say": "Video kehta hai strong consistency global scale par nahi chalti. Google Spanner globally strong consistency deta hai — Brewer (2017) ke shabdon mein technically CP, par practically bahut available. Keemat: commit par intezaar aur partition mein kuch operations ka rukna."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Split brain, fencing aur five nines",
      "project": "58-cap",
      "exercise": "ex5-split-brain",
      "goal": "ex5: bina quorum vs majority quorum, zombie leader bina/saath fencing, downtime ka hisaab. Phir lab ke tests.",
      "why": "Node 24+ chahiye. ex5 seeded hai, har run same.",
      "steps": [
        {
          "text": "Lab folder se: split brain.",
          "cmd": "cd docker-labs/58-cap && npm start -- ex5-split-brain",
          "expect": "A. Election ka niyam\n   no quorum        khud ko leader maanne wale 2   commit kar sakne wale 2   \"ho gaya\" bola 1,000   mana   0   jodne par gayab (bola tha \"ho gaya\") 395\n   majority quorum  khud ko leader maanne wale 2   commit kar sakne wale 1   \"ho gaya\" bola 605   mana 395   jodne par gayab (bola tha \"ho gaya\") 0\n\nB. Zombie leader — GC pause se jaaga, term 1 ke 50 purane writes storage ko bheje (naya leader term 2 par 100 likh chuka)\n   bina fencing                 storage ne mane 150   thukraaye  0   aakhri value old-49  ← PURANE leader ki\n   fencing token (term) check   storage ne mane 100   thukraaye 50   aakhri value new-99  \n\nC. Kitne nines, saal mein kitna downtime (365.25 din)\n   99     %   87 h 39 min 36.0 s\n   99.9   %   8 h 45 min 57.6 s\n   99.99  %   52 min 35.8 s\n   99.999 %   5 min 15.6 s"
        },
        {
          "text": "Lab ke 6 tests.",
          "cmd": "npm test",
          "expect": "✔ CRDT merges: order and repeats do not change the result (G-Counter, OR-Set); version vectors spot concurrency (5.753274ms)\n✔ bank split: CP refuses the small side and never overpays; LWW loses withdrawals from the books; offline limit bounds the loss (4.252657ms)\n✔ lag model: replicas apply in order; read-your-writes misses match the lag ranges; fixes remove the anomalies (38.246311ms)\n✔ conflicts: LWW loses likes and cart adds; the union brings back a removed item; CRDTs keep the intent (5.263998ms)\n✔ split brain: without a quorum the small side's acked writes are lost; fencing stops a woken old leader (0.524248ms)\n✔ PACELC: sync writes are on at least one replica when acked; async can lose acked writes in flight (238.155241ms)\nℹ tests 6\nℹ suites 0\nℹ pass 6\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0\nℹ duration_ms 334.308432"
        }
      ],
      "observe": {
        "q": "Majority quorum ke saath bhi zombie leader storage mein likh sakta tha. Kyun?",
        "choices": [
          "Quorum commit rokta hai; zombie storage mein seedha likhta",
          "Quorum sirf reads ke liye hota hai, writes ke liye nahi",
          "Zombie ne naya election jeet liya tha, isliye storage ne mana"
        ],
        "answer": 0,
        "hint": "Zombie ne apne writes kahan bheje?",
        "explain": "Quorum tay karta hai ki cluster mein kaun commit kare. Par GC pause se jaage purane leader ko pata hi nahi ki leader badal gaya — purana leader seedha shared storage ko likhta hai. Storage term check kare (fencing token) tabhi zombie rukta hai: lab mein 50 thukraaye.",
        "choiceExplanations": [
          "Quorum tay karta hai ki cluster mein kaun commit kare. Par GC pause se jaage purane leader ko pata hi nahi ki leader badal gaya — purana leader seedha shared storage ko likhta hai. Storage term check kare (fencing token) tabhi zombie rukta hai: lab mein 50 thukraaye.",
          "Quorum writes ke commit ke liye bhi hota hai (ex5 A).",
          "Zombie ne koi election nahi jeeta; zombie term 1 par hi tha."
        ]
      },
      "lesson": "Alag terms ke do nodes khud ko leader maan sakte hain; majority ke bina purana leader commit nahi kar sakta. Fencing purane leader ko storage par rokta hai. Five nines = saal mein ~5 min. Faisla data dekh kar, har operation ke liye."
    }
  ],
  "interview": {
    "title": "Interview Round — split brain",
    "instructions": "Pehle socho: kaun leader ban sakta hai, aur purana leader jaag jaaye toh kaun rokega? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Do-node Postgres cluster: primary aur standby. Health check fail hone par standby apne aap primary ban jaata hai. Kya khatra hai?",
        "choices": [
          "Network toote toh dono primary — purane ko pakka bahar karna chahiye",
          "Koi khatra nahi — standby tabhi primary banta hai jab primary sach mein mara ho",
          "Sirf latency badhegi, data par asar nahi",
          "Standby kabhi primary nahi ban sakta, Postgres mana karta hai"
        ],
        "answer": 0,
        "explain": "Do nodes mein majority (2 of 2) ke bina koi bhi \"main hi bacha hoon\" pakka nahi jaan sakta: health check fail = shak, saboot nahi (ex0). Network toota toh dono primary = split brain (ex5: 395 \"ho gaya\" writes gayab). Ek design: teesra voter (witness/quorum) aur tested fencing. Kuch bhi chuno, promotion se pehle purane primary ko pakka bahar karna (STONITH ya storage par term) zaroori hai.",
        "choiceExplanations": [
          "Do nodes mein majority (2 of 2) ke bina koi bhi \"main hi bacha hoon\" pakka nahi jaan sakta: health check fail = shak, saboot nahi (ex0). Network toota toh dono primary = split brain (ex5: 395 \"ho gaya\" writes gayab). Ek design: teesra voter (witness/quorum) aur tested fencing. Kuch bhi chuno, promotion se pehle purane primary ko pakka bahar karna (STONITH ya storage par term) zaroori hai.",
          "Health check atke primary ko bhi mara keh deta hai (ex0 ka jhoota alarm).",
          "Do primary = do alag histories; data par seedha asar.",
          "Postgres standby ko promote karna ek normal failover kadam hai."
        ]
      },
      {
        "q": "Like counter ke liye team kehti hai \"Cassandra AP hai, toh LWW theek hai\". Kya sahi hai?",
        "choices": [
          "Counter CRDT merge chahiye; LWW ginti likh kar likes khoyega",
          "Sahi hai — AP system mein LWW hamesha sahi jawab hi deta hai",
          "Likes ko CP banao — har like par majority ka intezaar",
          "LWW mein clock skew nahi hota, isliye likes nahi khote"
        ],
        "answer": 0,
        "explain": "AP sirf itna kehta hai ki partition mein jawab milega; merge ka niyam alag faisla hai. Ginti ko value ki tarah likha toh LWW ek ginti rakhega (ex4: 1,500 mein se 1,200). Counter CRDT (G-Counter, Cassandra counters jaisa) har replica ka hissa jodta hai.",
        "choiceExplanations": [
          "AP sirf itna kehta hai ki partition mein jawab milega; merge ka niyam alag faisla hai. Ginti ko value ki tarah likha toh LWW ek ginti rakhega (ex4: 1,500 mein se 1,200). Counter CRDT (G-Counter, Cassandra counters jaisa) har replica ka hissa jodta hai.",
          "LWW ek value chupchaap mitata hai; AP hone se LWW ka bartav nahi badalta.",
          "Har like par majority = har like mehnga; likes ke liye zaroorat nahi.",
          "LWW timestamps par chalta hai; skew se purana write bhi jeet sakta hai (ex4: 6.9%)."
        ]
      }
    ]
  },
  "success": [
    "Split brain aur quorum ka rishta numbers se bata sakte ho",
    "Fencing token kab chahiye samjha sakte ho",
    "Value vs volume data par CP/AP chun sakte ho"
  ],
  "cards": [
    {
      "front": "Split brain kaise rokein?",
      "back": "Majority quorum (leader banne aur commit ke liye). Lab 58 ex5: bina quorum 395 \"ho gaya\" writes gayab; quorum ke saath same 395 mana, gayab 0."
    },
    {
      "front": "Fencing token?",
      "back": "Har write ke saath leader ka term; storage purane term ke writes thukraaye. Lab 58 ex5: zombie ke 50 writes thukraaye; bina fencing aakhri value purane leader ki."
    },
    {
      "front": "Five nines?",
      "back": "99.999% = saal mein ~5 min 15 s service downtime (365 din: 5 min 15.36 s). CAP ka A alag: har zinda node ka jawab."
    }
  ]
}
]);
})();
