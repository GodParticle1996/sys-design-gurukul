/* Playlist · EDA Core topic 4: EDA races. Source credit: Software Developer Diaries,
   "The Hardest Problems in Event-Driven Architectures" (skb6-JaBNQw).
   Numbers: docker-labs/49-eda-races/captures. Docs: RabbitMQ confirms / consumers / queues, Kafka intro. */
(function () {
const HERO = [{"id": "key", "icon": "🔑", "label": "ek key, ek consumer", "x": 140, "y": 105}, {"id": "ver", "icon": "🔢", "label": "version / atomic", "x": 445, "y": 105}, {"id": "idem", "icon": "🧾", "label": "payment id", "x": 750, "y": 105}];
const EDGES = [{"from": "key", "to": "ver"}, {"from": "ver", "to": "idem"}];
VISUALS["er-kaise"] = { t: "Teen gadbad, teen ilaaj: kram ke liye ek key ek consumer, khoye update ke liye version, dohre kaam ke liye stable id.", html: SD.viz.svg(HERO, EDGES, { nodes: { key: {tone:'ok',badge:'kram'}, ver: {tone:'ok',badge:'khoya update'}, idem: {tone:'ok',badge:'dohra kaam'} } }, {w:890,h:215}) };
SD.registerLevels('sdd-eda', [
{
  "id": "er-kaise",
  "icon": "🔧",
  "group": "🏁 EDA Races",
  "title": "Races 2 · Kaise — kram, khoya update aur dohra kaam ka ilaaj",
  "badge": "Race Mistri",
  "objectives": [
    "Ek key ek consumer se kram kaise bachta hai, aur raftaar bhi?",
    "Compare-and-swap aur atomic update khoya update kaise rokte hain?",
    "Idempotency key kis cheez se bane, aur kahan likhi jaaye?",
    "Reorder buffer kab atakta hai?"
  ],
  "lesson": [
    "<h3>🔧 Teen gadbad ke teen ilaaj</h3><p>Board ke liye niyam: ek order ki parchi ek waqt ek hi waiter ke paas. Gullak ke liye: likhne se pehle jaancho ki number badla toh nahi. Register ke liye: har bill par parchi ka number, aur wahi number dobara aaye toh bill nahi.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "🔑 Ek order, ek waqt, ek consumer",
      "goal": "Wahi o1, wahi do consumers. Bas broker ab niyam rakhta hai: ek key (o1) ka ek hi message ek waqt bahar. tools/slowmo.js --story order --mode keyed, nakli ghadi. Ack baaki = line mein pade aur consumers ke paas lease par diye messages, dono; message uthne par ginti nahi ghatti, ack par ghatti hai.",
      "nodes": [
        {
          "id": "line",
          "icon": "📬",
          "label": "line (o1)",
          "x": 150,
          "y": 165
        },
        {
          "id": "a",
          "icon": "🏃",
          "label": "A · 5 ms",
          "x": 445,
          "y": 85
        },
        {
          "id": "b",
          "icon": "🐢",
          "label": "B · 40 ms",
          "x": 445,
          "y": 245
        },
        {
          "id": "db",
          "icon": "🗃️",
          "label": "orders",
          "x": 740,
          "y": 165
        }
      ],
      "edges": [
        {
          "from": "line",
          "to": "a"
        },
        {
          "from": "line",
          "to": "b"
        },
        {
          "from": "a",
          "to": "db"
        },
        {
          "from": "b",
          "to": "db"
        }
      ],
      "viz": {
        "w": 890,
        "h": 330,
        "focus": [
          "a",
          "b"
        ]
      },
      "vars": [
        {
          "id": "db",
          "label": "DB mein o1"
        },
        {
          "id": "a",
          "label": "A ke haath mein"
        },
        {
          "id": "b",
          "label": "B ke haath mein"
        },
        {
          "id": "line",
          "label": "Ack baaki"
        }
      ],
      "steps": [
        {
          "title": "A ne #1 uthaya",
          "clock": "0 ms",
          "say": "A ko #1 mila. B ne bhi line se maanga — par o1 ka ek message pehle se bahar hai, toh B ko kuch nahi mila.",
          "nodes": {
            "line": {
              "tone": "busy",
              "badge": "5"
            },
            "a": {
              "tone": "busy",
              "badge": "#1"
            },
            "b": {
              "tone": "idle",
              "badge": "kuch nahi"
            },
            "db": {
              "tone": "idle",
              "badge": "—"
            }
          },
          "vars": {
            "db": "—",
            "a": "#1 placed",
            "b": "—",
            "line": "5"
          },
          "flows": [
            {
              "from": "line",
              "to": "a",
              "label": "#1",
              "tone": "acc"
            }
          ],
          "ask": {
            "q": "Line mein #2 pada hai aur B khaali hai. Broker ne #2 B ko kyun nahi diya?",
            "choices": [
              "o1 ka #1 abhi A ke paas hai — ek key ka ek hi message ek waqt bahar",
              "B dheema hai, isliye broker dheeme consumer ko message nahi deta",
              "#2 abhi publish hi nahi hua, isliye line mein dikh kar bhi mil nahi sakta"
            ],
            "answer": 0,
            "hint": "Broker ka naya niyam kya hai?",
            "explain": "Keyed mode mein broker dekhta hai ki o1 ka koi message bahar (lease par) toh nahi. Hai, toh o1 ka agla message ruka. Is niyam se o1 ke events kram mein, ek ke baad ek likhe jaate hain. Kafka mein key se partition; RabbitMQ mein key se alag queues, har queue par single active consumer.",
            "choiceExplanations": [
              "Keyed mode mein broker dekhta hai ki o1 ka koi message bahar (lease par) toh nahi. Hai, toh o1 ka agla message ruka. Is niyam se o1 ke events kram mein, ek ke baad ek likhe jaate hain. Kafka mein key se partition; RabbitMQ mein key se alag queues, har queue par single active consumer.",
              "Broker speed nahi dekhta. Dekhta hai ki o1 ka message pehle se bahar hai ya nahi.",
              "Saare 5 message pehle hi publish ho chuke hain; #2 key ki wajah se ruka."
            ]
          }
        },
        {
          "title": "Ek-ek karke",
          "clock": "15 ms",
          "say": "5 ms par A ne #1 likha, tab #2 bahar aaya — A ko hi mila. Phir #3, #4.",
          "nodes": {
            "line": {
              "tone": "busy",
              "badge": "2"
            },
            "a": {
              "tone": "busy",
              "badge": "#4"
            },
            "b": {
              "tone": "idle",
              "badge": "kuch nahi"
            },
            "db": {
              "tone": "ok",
              "badge": "packed"
            }
          },
          "vars": {
            "db": "packed",
            "a": "#4 shipped",
            "b": "—",
            "line": "2"
          }
        },
        {
          "title": "Kram mein khatam",
          "clock": "25 ms",
          "say": "25 ms par #5 likha: o1 = delivered. Ulte kram mein kuch nahi likha gaya. B is order par khaali raha.",
          "nodes": {
            "line": {
              "tone": "ok",
              "badge": "0"
            },
            "a": {
              "tone": "ok",
              "badge": "khaali"
            },
            "b": {
              "tone": "idle",
              "badge": "kuch nahi"
            },
            "db": {
              "tone": "ok",
              "badge": "delivered"
            }
          },
          "vars": {
            "db": "delivered",
            "a": "—",
            "b": "—",
            "line": "0"
          },
          "ask": {
            "q": "Ek order par ab parallel kaam nahi hua. Toh doosra consumer bekaar hai?",
            "choices": [
              "Nahi — alag orders (o2, o3) alag consumers par saath chal sakte hain",
              "Haan — keyed mode mein hamesha sirf ek consumer kaam karta hai",
              "Haan — kram chahiye toh poore system mein ek hi consumer rakhna padega"
            ],
            "answer": 0,
            "hint": "Niyam ek key par hai, ya poori line par?",
            "explain": "Niyam har key ka alag hai: o1 ek waqt ek consumer, par o2 aur o3 doosre consumer par saath chal sakte hain. Lab ke 3 orders wale run mein keyed mode mein dono consumers ne kaam kiya (A/B jaise 11/4), aur ulte kram 0.",
            "choiceExplanations": [
              "Niyam har key ka alag hai: o1 ek waqt ek consumer, par o2 aur o3 doosre consumer par saath chal sakte hain. Lab ke 3 orders wale run mein keyed mode mein dono consumers ne kaam kiya (A/B jaise 11/4), aur ulte kram 0.",
              "Ek key par ek consumer; alag keys alag consumers par chalti hain.",
              "Kram ek order ke andar chahiye, poore system mein nahi. Isliye key ke hisaab se baanto."
            ]
          }
        }
      ],
      "lesson": "Ek key ke saare events ek waqt ek hi consumer ko do, aur events kram mein process karo: kram bachta hai. Alag keys parallel chalti hain, toh raftaar bhi bachti hai. Kafka mein key se partition; RabbitMQ mein key se alag queues, har queue par single active consumer. Seema: kaam lease se lamba chale toh broker message doosre worker ko de deta hai, par purana worker abhi bhi likh sakta hai."
    },
    {
      "type": "dryrun",
      "title": "🧾 Bill likha, ack nahi — dobara aaya toh?",
      "goal": "Payment p1 (u1, ₹100). Consumer charge likh ke ack se pehle crash hota hai; lease 300 ms. Is baar key = payment id, charge ke saath ek transaction mein. tools/slowmo.js --story phantom --mode paymentId. Ack baaki = line mein pade aur consumers ke paas lease par diye messages, dono; message uthne par ginti nahi ghatti, ack par ghatti hai.",
      "nodes": [
        {
          "id": "line",
          "icon": "📬",
          "label": "line",
          "x": 150,
          "y": 120
        },
        {
          "id": "pay",
          "icon": "💳",
          "label": "consumer",
          "x": 445,
          "y": 120
        },
        {
          "id": "db",
          "icon": "🗃️",
          "label": "charges DB",
          "x": 740,
          "y": 120
        }
      ],
      "edges": [
        {
          "from": "line",
          "to": "pay"
        },
        {
          "from": "pay",
          "to": "db"
        }
      ],
      "viz": {
        "w": 890,
        "h": 240,
        "focus": [
          "pay",
          "db"
        ]
      },
      "vars": [
        {
          "id": "charges",
          "label": "Charges"
        },
        {
          "id": "processed",
          "label": "Processed keys"
        },
        {
          "id": "attempt",
          "label": "Delivery"
        },
        {
          "id": "line",
          "label": "Ack baaki"
        }
      ],
      "steps": [
        {
          "title": "p1 uthaya",
          "clock": "10 ms",
          "say": "Consumer ko p1 mila (pehli delivery). Broker ne 300 ms ki lease di: ack na aaye toh dobara dega.",
          "nodes": {
            "line": {
              "tone": "busy",
              "badge": "p1 lease par"
            },
            "pay": {
              "tone": "busy",
              "badge": "p1"
            },
            "db": {
              "tone": "idle",
              "badge": "khaali"
            }
          },
          "vars": {
            "charges": "—",
            "processed": "—",
            "attempt": "1",
            "line": "1"
          },
          "flows": [
            {
              "from": "line",
              "to": "pay",
              "label": "p1",
              "tone": "acc"
            }
          ]
        },
        {
          "title": "Ek saath likha: key + charge",
          "clock": "20 ms",
          "say": "Ek transaction mein: processed mein \"p1\" aur charges mein p1. Dono saath likhe gaye — ya dono nahi.",
          "nodes": {
            "line": {
              "tone": "busy",
              "badge": "p1 lease par"
            },
            "pay": {
              "tone": "busy",
              "badge": "likha"
            },
            "db": {
              "tone": "ok",
              "badge": "p1"
            }
          },
          "vars": {
            "charges": "p1",
            "processed": "p1",
            "attempt": "1",
            "line": "1"
          },
          "flows": [
            {
              "from": "pay",
              "to": "db",
              "label": "key + charge",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "Ack se pehle crash",
          "clock": "21 ms",
          "say": "Consumer band. Broker ko ack nahi mila, toh p1 abhi bhi line mein (lease par).",
          "nodes": {
            "line": {
              "tone": "slow",
              "badge": "p1 baaki"
            },
            "pay": {
              "tone": "bad",
              "badge": "crash"
            },
            "db": {
              "tone": "ok",
              "badge": "p1"
            }
          },
          "vars": {
            "charges": "p1",
            "processed": "p1",
            "attempt": "1",
            "line": "1"
          }
        },
        {
          "title": "Lease khatam: p1 dobara",
          "clock": "310 ms",
          "say": "Consumer dobara chalu. 310 ms par lease khatam, p1 dobara mila (doosri delivery).",
          "nodes": {
            "line": {
              "tone": "busy",
              "badge": "p1 lease par"
            },
            "pay": {
              "tone": "busy",
              "badge": "p1 (2)"
            },
            "db": {
              "tone": "ok",
              "badge": "p1"
            }
          },
          "vars": {
            "charges": "p1",
            "processed": "p1",
            "attempt": "2",
            "line": "1"
          },
          "flows": [
            {
              "from": "line",
              "to": "pay",
              "label": "p1 dobara",
              "tone": "slow"
            }
          ],
          "ask": {
            "q": "processed mein \"p1\" pehle se hai. Ab consumer kya karega?",
            "choices": [
              "Key ka INSERT kuch nahi badlega — duplicate hai, toh charge nahi, sirf ack",
              "Naya charge likhega — attempt 2 aaya hai, toh attempt 2 ek naya payment hai",
              "Pehla charge mita ke naya likhega, taaki DB mein ek hi charge bacha rahe"
            ],
            "answer": 0,
            "hint": "processed table mein payment id unique hai.",
            "explain": "\"p1\" pehle se processed mein hai, toh INSERT OR IGNORE ne kuch nahi joda (changes = 0). Consumer ne p1 ko duplicate pehchana: charge nahi, sirf ack. Lab ke asli crash wale run mein bhi yahi: p1 aur p2 ek-ek baar.",
            "choiceExplanations": [
              "\"p1\" pehle se processed mein hai, toh INSERT OR IGNORE ne kuch nahi joda (changes = 0). Consumer ne p1 ko duplicate pehchana: charge nahi, sirf ack. Lab ke asli crash wale run mein bhi yahi: p1 aur p2 ek-ek baar.",
              "Delivery ki ginti payment ki pehchaan nahi. Payment id wahi hai — wahi payment.",
              "Pehla charge sahi tha; mitana galat hai. Duplicate ko bas chhodna hai."
            ]
          }
        },
        {
          "title": "Sirf ack",
          "clock": "320 ms",
          "say": "Charge nahi likha, ack bheja. Line khaali. Charges: sirf ek p1.",
          "nodes": {
            "line": {
              "tone": "ok",
              "badge": "0"
            },
            "pay": {
              "tone": "ok",
              "badge": "ack"
            },
            "db": {
              "tone": "ok",
              "badge": "p1 ek baar"
            }
          },
          "vars": {
            "charges": "p1",
            "processed": "p1",
            "attempt": "2",
            "line": "0"
          }
        }
      ],
      "lesson": "Broker ack na mile toh dobara deta hai — ye hona hi hai. Ilaaj consumer mein: producer ki stable id (payment id) ko kaam ke saath ek hi transaction mein unique likho. Dobara aaye toh id pehle se milegi: kaam nahi, sirf ack."
    },
    {
      "type": "cards",
      "title": "🔧 Khoya update, sahi key, aur atka buffer",
      "goal": "Teen aur sawaal: gullak ka khoya ₹10 kaise bachayein, key kis cheez se banayein, aur buffer kab atakta hai?",
      "lesson": "Khoye update ke liye version (compare-and-swap) ya DB ka atomic update. Duplicate ke liye producer ki stable id, kaam ke saath ek transaction mein. Reorder buffer khoye number par atakta hai — timeout aur alert chahiye.",
      "steps": [
        {
          "title": "1. Gullak ka khoya ₹10",
          "say": "Lab: 1,000 par 20 baar +10, do consumer processes. Padho → 20 ms → likho: <b>1,100</b> (10 update khoye). Version jaancho (<code>WHERE version = ?</code>), fail ho toh dobara: <b>1,200</b>, par 20 events ke liye <b>39</b> koshishein. DB khud jode (<code>balance = balance + 10</code>): <b>1,200</b>, 20 koshishein.",
          "ask": {
            "q": "Compare-and-swap ne 20 events par 39 koshishein kyun li?",
            "choices": [
              "Dono ne aksar ek hi version padha; ek jeeta, doosre ko dobara padhna pada",
              "Har event broker se do baar aaya, isliye har event par do koshish lagi",
              "SQLite har UPDATE ko pehli koshish mein hamesha reject kar deta hai"
            ],
            "answer": 0,
            "hint": "Version wali shart kab fail hoti hai?",
            "explain": "Dono consumers ek hi version padh ke likhne aate hain. Ek ka UPDATE chal jaata hai aur version badh jaata hai; doosre ka WHERE version = purana fail (changes = 0), toh doosra consumer dobara padhta hai. Sahi nateeja, par mehnat zyada. Jab sirf jodna ho, atomic update sasta hai.",
            "choiceExplanations": [
              "Dono consumers ek hi version padh ke likhne aate hain. Ek ka UPDATE chal jaata hai aur version badh jaata hai; doosre ka WHERE version = purana fail (changes = 0), toh doosra consumer dobara padhta hai. Sahi nateeja, par mehnat zyada. Jab sirf jodna ho, atomic update sasta hai.",
              "Har event ek hi baar aaya (20). Extra koshishein version ki takkar se aayi.",
              "Fail sirf tab hota hai jab version badal chuka ho — har baar nahi."
            ]
          }
        },
        {
          "title": "2. Key kis cheez se?",
          "say": "Lab ka asli crash: p1 likha, ack se pehle crash, p1 dobara aaya. Saath mein p2 — u1 ki hi asli doosri ₹100 ki khareed. Sahi: p1 aur p2 ek-ek baar.",
          "ask": {
            "q": "Video key banata hai user ID + amount. Lab mein kya hua?",
            "choices": [
              "Sirf p1 kata — p2 asli khareed thi, par u1:100 pehle se tha toh chhod di",
              "p1 do baar kata — user + amount wali key duplicate pakad hi nahi paati",
              "Dono sahi — user + amount har payment ki pakki aur alag pehchaan hai"
            ],
            "answer": 0,
            "hint": "p1 aur p2 ka user aur amount kya hai?",
            "explain": "p1 aur p2 dono u1 ke ₹100 the, toh dono ki key u1:100. p2 asli doosri khareed thi, par duplicate maan ke chhod di gayi. Aane ke waqt wali key ulta karti hai: dobara aaye p1 ka waqt naya, toh p1 do baar kata. Sahi key producer ki stable id hai: payment id.",
            "choiceExplanations": [
              "p1 aur p2 dono u1 ke ₹100 the, toh dono ki key u1:100. p2 asli doosri khareed thi, par duplicate maan ke chhod di gayi. Aane ke waqt wali key ulta karti hai: dobara aaye p1 ka waqt naya, toh p1 do baar kata. Sahi key producer ki stable id hai: payment id.",
              "user + amount ne duplicate pakda — itna zyada ki asli p2 bhi duplicate maan li.",
              "Ek user ek hi amount do baar sach mein de sakta hai. user + amount pehchaan nahi."
            ]
          }
        },
        {
          "title": "3. Buffer ka atakna",
          "say": "Video ka tareeka: har order ka \"last processed\" yaad rakho; agla number na ho toh buffer mein rakho. Lab mein ye 0 ulte kram deta hai. Par jab o2 ka #3 kabhi aaya hi nahi: o2 <b>paid</b> par atka, #4 aur #5 buffer mein hamesha ke liye (teeno runs mein). Aur last-processed se chhota ya barabar seq dobara aaye toh pehle se likha ja chuka hai: buffer mein mat rakho, sirf agle expected seq se bade events buffer mein jaayein.",
          "ask": {
            "q": "Buffer wale tareeke mein aur kya chahiye?",
            "choices": [
              "Khoye number ka timeout aur alert, aur buffer durable store mein",
              "Kuch nahi — buffer khoye number ko kuch der baad khud bana leta hai",
              "Buffer ki jagah RAM ka array, taaki kaam aur tez ho"
            ],
            "answer": 0,
            "hint": "#3 kabhi nahi aaya. Kaun jaanega?",
            "explain": "Buffer agle number ka intezaar karta hai — number na aaye toh hamesha. Isliye kitni der se atka hai, us par alert aur resync ka raasta chahiye. Buffer aur last-processed durable store mein hon, warna restart par kho jaate hain (lab mein SQLite mein hain).",
            "choiceExplanations": [
              "Buffer agle number ka intezaar karta hai — number na aaye toh hamesha. Isliye kitni der se atka hai, us par alert aur resync ka raasta chahiye. Buffer aur last-processed durable store mein hon, warna restart par kho jaate hain (lab mein SQLite mein hain).",
              "Buffer khoya message nahi bana sakta; sirf intezaar karta hai.",
              "RAM ka buffer restart par kho jaata hai — atke updates bhi gaye."
            ]
          }
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Asli crash aur asli khoya update",
      "project": "49-eda-races",
      "exercise": "ex3-phantom",
      "goal": "Pehle asli crash ke saath chaar keys. Phir do consumer processes ek balance par.",
      "why": "Node 24+ chahiye. Consumer sach mein process exit karta hai; supervisor dobara chalata hai. Dono tools ke teeno runs byte-identical rahe.",
      "steps": [
        {
          "text": "Lab folder se: crash, redelivery aur chaar keys.",
          "cmd": "cd docker-labs/49-eda-races && npm start -- ex3-phantom",
          "expect": "none       crash=1 charges=3 [p1,p2,p1] GALAT (sahi: p1,p2)\nuserAmount crash=1 charges=1 [p1] GALAT (sahi: p1,p2)\narrival    crash=1 charges=3 [p1,p2,p1] GALAT (sahi: p1,p2)\npaymentId  crash=1 charges=2 [p1,p2] sahi"
        },
        {
          "text": "Do consumers, ek balance; phir kram ka asar.",
          "cmd": "npm start -- ex2-conflict",
          "expect": "unsafe  balance=1100 (sahi 1200) khoye-updates=10 koshishein=20 version=0\ncas     balance=1200 (sahi 1200) khoye-updates=0 koshishein=39 version=20\natomic  balance=1200 (sahi 1200) khoye-updates=0 koshishein=20 version=0\nset events (balance = 90, phir 100): sahi kram 100 · ulta kram 90\ndelta events (+100, −30) 1000 se: sahi kram 1070 · ulta kram 1070\ndelta events 0 se, niyam \"balance minus mein nahi\": sahi kram 70 · ulta kram 100 (−30 reject)"
        }
      ],
      "observe": {
        "q": "ex3 mein \"arrival\" (user + aane ka waqt) ki key ke saath bhi charges=3. Kyun?",
        "choices": [
          "Dobara aaye p1 ka aane ka waqt naya tha, toh key naya bana — duplicate pakda nahi",
          "Arrival key mein amount nahi hai, isliye teeno payments alag maane gaye",
          "Supervisor ne consumer ko do baar chalaya, isliye ek charge extra bana"
        ],
        "answer": 0,
        "hint": "Key mein kya hai, aur redelivery par kya badalta hai?",
        "explain": "Key = user + aane ka waqt. p1 pehli baar aur dobara alag waqt par aaya, toh do alag keys: dono baar charge. Key mein wahi cheez ho jo redelivery par na badle — producer ki payment id.",
        "choiceExplanations": [
          "Key = user + aane ka waqt. p1 pehli baar aur dobara alag waqt par aaya, toh do alag keys: dono baar charge. Key mein wahi cheez ho jo redelivery par na badle — producer ki payment id.",
          "Amount jodne se bhi waqt alag rehta; dikkat waqt ka badalna hai.",
          "crash=1: ek hi baar dobara chala. Extra charge redelivery ki naye key se aaya."
        ]
      },
      "lesson": "Redelivery hogi — key wahi chuno jo redelivery par na badle, aur kaam ke saath ek transaction mein likho. Ek balance par do writers ho toh version ya atomic update."
    }
  ],
  "interview": {
    "title": "Interview Round — ilaaj chuno",
    "instructions": "Pehle gadbad pehchano: kram, khoya update, ya dohra kaam. Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Kafka par order events hain. Ek hi order ke events kabhi ulte kram mein process hote hain. Topic ki key random UUID hai. Sabse chhota sahi badlaav?",
        "choices": [
          "Key = order id — ek order ke events ek partition mein, ek consumer, kram mein",
          "Partitions badha do — zyada partitions hon toh kram apne aap theek ho jaata hai",
          "Consumers ki ginti partitions se zyada kar do, taaki koi event ruke nahi",
          "Har event par 100 ms ka sleep lagao, taaki pehle wala pehle khatam ho"
        ],
        "answer": 0,
        "explain": "Kafka ek partition ke andar kram rakhta hai, aur same key wale events same partition mein jaate hain. Random key se ek order ke events alag partitions mein, alag consumers par — kram toot-ta hai. Key = order id.",
        "choiceExplanations": [
          "Kafka ek partition ke andar kram rakhta hai, aur same key wale events same partition mein jaate hain. Random key se ek order ke events alag partitions mein, alag consumers par — kram toot-ta hai. Key = order id.",
          "Partitions badhane se ek order ke events aur zyada bikhrenge. Kram key se aata hai.",
          "Partition se zyada consumers khaali baithte hain; kram nahi sudhrta.",
          "Sleep timing chhupata hai, race nahi mitata — load badla toh phir ulta kram."
        ]
      },
      {
        "q": "Wallet service: \"balance padho, naya balance likho\". Do consumers par kabhi-kabhi top-up gayab. Kaunsa badlaav?",
        "choices": [
          "UPDATE balance = balance + amount, ya version ki shart ke saath likho",
          "Consumers ko 1 kar do aur saath mein events ka retry band kar do",
          "Har top-up ko do baar bhejo, taaki ek khoye toh doosra pahunch jaaye",
          "Balance Redis cache mein rakho aur padh-likh dono cache se hi karo"
        ],
        "answer": 0,
        "explain": "Dikkat padhne aur likhne ke beech ka gap hai. DB ko khud jodne do (atomic update), ya likhte waqt version jaancho aur fail par dobara padho. Lab: padho-ruko-likho par 20 mein se 10 khoye; atomic aur CAS par 1,200.",
        "choiceExplanations": [
          "Dikkat padhne aur likhne ke beech ka gap hai. DB ko khud jodne do (atomic update), ya likhte waqt version jaancho aur fail par dobara padho. Lab: padho-ruko-likho par 20 mein se 10 khoye; atomic aur CAS par 1,200.",
          "Ek consumer ki raftaar bandh jaati hai, aur retry band karne se khoye message wapas nahi aate.",
          "Do baar bhejne se duplicate top-up hoga, aur padhne-likhne ka gap waisa hi rahega.",
          "Cache par bhi wahi padho-likho gap hai; jagah badalne se race nahi jaati."
        ]
      }
    ]
  },
  "success": [
    "Kram ke liye key-based routing samjha sakte ho",
    "Lost update ko CAS ya atomic update se rok sakte ho",
    "Sahi idempotency key aur transaction ki jagah bata sakte ho"
  ],
  "cards": [
    {
      "front": "Kram ka sabse seedha ilaaj?",
      "back": "Ek key ke events ek waqt ek consumer ko, kram mein: Kafka mein key se partition; RabbitMQ mein key se alag queues, har queue par single active consumer."
    },
    {
      "front": "Khoye update ka ilaaj?",
      "back": "DB ka atomic update (balance = balance + x), ya version ki shart (compare-and-swap) aur fail par dobara."
    },
    {
      "front": "Idempotency key kis se?",
      "back": "Producer ki stable id (payment id). Kaam ke saath ek transaction mein unique. user + amount ya aane ka waqt galat."
    }
  ]
}
]);
})();
