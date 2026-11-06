/* Playlist · EDA Core topic 4: EDA races. Source credit: Software Developer Diaries,
   "The Hardest Problems in Event-Driven Architectures" (skb6-JaBNQw).
   Numbers: docker-labs/49-eda-races/captures. */
(function () {
const HERO = [{"id": "line", "icon": "📬", "label": "line", "x": 140, "y": 105}, {"id": "a", "icon": "🏃", "label": "A (tez)", "x": 445, "y": 60}, {"id": "b", "icon": "🐢", "label": "B (dheema)", "x": 445, "y": 160}, {"id": "db", "icon": "🗃️", "label": "orders", "x": 750, "y": 105}];
const EDGES = [{"from": "line", "to": "a"}, {"from": "line", "to": "b"}, {"from": "a", "to": "db"}, {"from": "b", "to": "db"}];
VISUALS["er-kyun"] = { t: "Do consumers, ek order. Tez wala aage nikal gaya — dheeme wale ki purani khabar aakhir mein likhi gayi.", html: SD.viz.svg(HERO, EDGES, { nodes: { line: {tone:'ok',badge:'1 → 5'}, a: {tone:'ok',badge:'5 ms'}, b: {tone:'slow',badge:'40 ms'}, db: {tone:'bad',badge:'paid?!'} } }, {w:890,h:215}) };
SD.registerLevels('sdd-eda', [
{
  "id": "er-kyun",
  "icon": "🏁",
  "group": "🏁 EDA Races",
  "title": "Races 1 · Kyun — sab sahi chala, phir bhi order \"paid\" kyun dikha?",
  "badge": "Race Shishya",
  "objectives": [
    "Competing consumers kram kaise todte hain?",
    "Do consumers ek hi value badlein toh update kaise khota hai?",
    "Ack se pehle crash se kaam do baar kaise hota hai?"
  ],
  "lesson": [
    "<h3>🏁 Do waiter, ek board</h3><p>Asha ke dhabe par do waiter order board par haalat likhte hain: ek tez, ek dheema. Parchiyan kram mein aati hain — placed, paid, packed, shipped, delivered.</p><p>Board par aakhir mein kya likha hoga? Pehle dekho.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "🏃🐢 Do waiter, ek order board",
      "goal": "Order o1 ki 5 haalatein line mein: placed → paid → packed → shipped → delivered. Do consumers line se jo milta hai uthate hain: A har message 5 ms mein, B 40 ms mein. Ye lab 49 ke tools/slowmo.js --story order --mode shared ka nakli-ghadi run hai; wahi broker aur wahi DB code. Ack baaki = line mein pade aur consumers ke paas lease par diye messages, dono; message uthne par ginti nahi ghatti, ack par ghatti hai.",
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
          "b",
          "db"
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
          "title": "Dono ne ek-ek uthaya",
          "clock": "0 ms",
          "say": "Line se A ko #1 (placed) mila, B ko #2 (paid). Dono kaam shuru.",
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
              "tone": "slow",
              "badge": "#2"
            },
            "db": {
              "tone": "idle",
              "badge": "—"
            }
          },
          "vars": {
            "db": "—",
            "a": "#1 placed",
            "b": "#2 paid",
            "line": "5"
          },
          "flows": [
            {
              "from": "line",
              "to": "a",
              "label": "#1",
              "tone": "acc"
            },
            {
              "from": "line",
              "to": "b",
              "label": "#2",
              "tone": "acc"
            }
          ]
        },
        {
          "title": "A tez hai",
          "clock": "5 ms",
          "say": "5 ms par A ne #1 likha aur #3 (packed) uthaya. B abhi #2 par hi hai.",
          "nodes": {
            "line": {
              "tone": "busy",
              "badge": "4"
            },
            "a": {
              "tone": "busy",
              "badge": "#3"
            },
            "b": {
              "tone": "slow",
              "badge": "#2"
            },
            "db": {
              "tone": "ok",
              "badge": "placed"
            }
          },
          "vars": {
            "db": "placed",
            "a": "#3 packed",
            "b": "#2 paid",
            "line": "4"
          },
          "flows": [
            {
              "from": "a",
              "to": "db",
              "label": "placed",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "A aage nikal gaya",
          "clock": "20 ms",
          "say": "10 ms par packed, 15 ms par shipped, 20 ms par delivered. A ne #1, #3, #4, #5 likh diye.",
          "nodes": {
            "line": {
              "tone": "slow",
              "badge": "1"
            },
            "a": {
              "tone": "ok",
              "badge": "khaali"
            },
            "b": {
              "tone": "slow",
              "badge": "#2"
            },
            "db": {
              "tone": "ok",
              "badge": "delivered"
            }
          },
          "vars": {
            "db": "delivered",
            "a": "—",
            "b": "#2 paid",
            "line": "1"
          },
          "ask": {
            "q": "DB mein ab delivered hai. B ke haath mein abhi bhi #2 (paid) hai. 40 ms par B kya karega?",
            "choices": [
              "#2 likh dega — DB delivered se wapas paid ho jaayega",
              "#2 chhod dega — B dekh lega ki order delivered ho chuka hai",
              "#2 ko line mein wapas daal dega, taaki kram theek ho jaaye"
            ],
            "answer": 0,
            "hint": "B ka code DB ki maujooda haalat padhta hai, ya seedha likhta hai?",
            "explain": "Is code mein consumer seedha likhta hai: \"o1 ki haalat = paid\". B ko pata hi nahi ki A ne #3, #4, #5 likh diye. Purani khabar aakhir mein likhi gayi, toh aakhri haalat galat.",
            "choiceExplanations": [
              "Is code mein consumer seedha likhta hai: \"o1 ki haalat = paid\". B ko pata hi nahi ki A ne #3, #4, #5 likh diye. Purani khabar aakhir mein likhi gayi, toh aakhri haalat galat.",
              "Ye code DB ki haalat jaanche bina likhta hai. Jaanch ka code agle level mein dekhenge.",
              "B message ko line mein wapas nahi bhejta; kaam karke ack karta hai."
            ]
          }
        },
        {
          "title": "Purani khabar aakhir mein",
          "clock": "40 ms",
          "say": "40 ms par B ne #2 likha: o1 = paid. Order pahunch chuka, par board kehta hai \"paid\".",
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
              "tone": "ok",
              "badge": "khaali"
            },
            "db": {
              "tone": "bad",
              "badge": "paid"
            }
          },
          "vars": {
            "db": "paid",
            "a": "—",
            "b": "—",
            "line": "0"
          },
          "flows": [
            {
              "from": "b",
              "to": "db",
              "label": "paid",
              "tone": "bad"
            }
          ]
        }
      ],
      "lesson": "Line se messages kram mein nikle, par do consumers ki raftaar alag thi. Dheeme consumer ki purani khabar baad mein likhi gayi, aur o1 delivered se wapas paid ho gaya. Kram line mein nahi, likhne mein toota."
    },
    {
      "type": "cards",
      "title": "🍽️ Dhabe ki teen gadbad — pehle socho, phir naam",
      "goal": "Ulta kram ek gadbad thi. Do aur hain: ek hi gullak par do cashier, aur ek cashier jo bill likh ke behosh ho gaya.",
      "lesson": "Teen gadbad: alag raftaar se ulta kram, ek saath padh-likh ke khoya update, aur ack se pehle crash se dohra kaam. Teeno events mein aam hain, aur teeno ka ilaaj alag hai.",
      "steps": [
        {
          "title": "1. Ek gullak, do cashier",
          "say": "Gullak mein ₹1,000. Do cashier ek saath gullak ki parchi padhte hain: 1,000. Dono ₹10 jodte hain aur parchi par likhte hain: 1,010.",
          "ask": {
            "q": "Do baar ₹10 aaye. Parchi par aakhir mein kitna likha hai?",
            "choices": [
              "1,010 — dono ne 1,000 padh ke 1,010 likha; ek ₹10 kho gaya",
              "1,020 — dono ne ₹10 joda, toh parchi apne aap 1,020 dikhayegi",
              "1,000 — do cashier ek saath likhein toh parchi pehle jaisi rehti hai"
            ],
            "answer": 0,
            "hint": "Dusre cashier ne kaunsa number padha tha?",
            "explain": "Dono ne likhne se pehle 1,000 padha. Doosre ne pehle wale ka 1,010 dekha hi nahi, aur apna 1,010 pehle wale ke 1,010 ke upar likh diya. Lab mein 20 baar +10 par 10 updates aise hi khoye: 1,200 ki jagah 1,100.",
            "choiceExplanations": [
              "Dono ne likhne se pehle 1,000 padha. Doosre ne pehle wale ka 1,010 dekha hi nahi, aur apna 1,010 pehle wale ke 1,010 ke upar likh diya. Lab mein 20 baar +10 par 10 updates aise hi khoye: 1,200 ki jagah 1,100.",
              "Parchi par jo aakhri likha, wahi rehta hai. Doosre ka 1,010 pehle ke 1,010 ke upar likha gaya.",
              "Dono ne likha. Bas dono ne ek hi purane 1,000 se hisaab lagaya."
            ]
          }
        },
        {
          "title": "2. Bill likha, phir behosh",
          "say": "Cashier ne Asha ka ₹100 ka bill register mein likh diya. Parchi par \"ho gaya\" ki mohar lagane se pehle hi behosh ho gaya. Parchi wapas tray mein. Doosra cashier parchi uthata hai.",
          "ask": {
            "q": "Doosra cashier register dekhe bina bill likh de, toh Asha se kitna kata?",
            "choices": [
              "₹200 — register mein do bill, kyunki pehla bill likha ja chuka tha",
              "₹100 — parchi par mohar nahi thi, toh pehla bill apne aap radd ho gaya",
              "₹0 — behosh hone se register ka pichhla bill bhi mit gaya"
            ],
            "answer": 0,
            "hint": "Register mein pehla bill tha ya nahi?",
            "explain": "Bill register mein likha ja chuka tha; sirf mohar (ack) reh gayi. Parchi dobara aayi, aur bina jaanch ke doosra bill bhi likha gaya. Lab mein asli crash ke baad p1 do baar kata.",
            "choiceExplanations": [
              "Bill register mein likha ja chuka tha; sirf mohar (ack) reh gayi. Parchi dobara aayi, aur bina jaanch ke doosra bill bhi likha gaya. Lab mein asli crash ke baad p1 do baar kata.",
              "Mohar na lagne se register ka bill nahi mit-ta. Likha hua kaam ho chuka hai.",
              "Behosh hone se register nahi mit-ta. Pehla bill wahin hai."
            ]
          }
        },
        {
          "title": "3. Naam",
          "say": "Alag raftaar ke consumers se purani khabar baad mein likhna: <b>out-of-order processing</b>. Do consumers ka ek saath padhna-jodna-likhna aur ek update kho jaana: <b>lost update</b>. Kaam ho gaya par ack nahi gaya, toh message dobara aaya aur kaam do baar: <b>phantom failure</b> (redelivery se duplicate). Ye teeno <b>race conditions</b> hain: nateeja kaam ki timing par tika hai."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Asli processes, asli DB — race har baar alag",
      "project": "49-eda-races",
      "exercise": "ex1-order",
      "goal": "3 orders × 5 haalatein, do consumer processes, ek SQLite file. Pehle shared line, phir fix wale modes.",
      "why": "Node 24+ chahiye (built-in SQLite). Tool broker aur consumers khud chalata aur band karta hai. Race timing par tiki hai: 13 runs mein ulte kram har baar 2–3 rahe, par galat aakhri haalat sirf ek run mein aayi (o2, o3 = shipped); neeche pehla run.",
      "steps": [
        {
          "text": "Lab folder se: chaaron modes.",
          "cmd": "cd docker-labs/49-eda-races && npm start -- ex1-order",
          "expect": "shared     likhe=15 ulte-kram=2 [o1#1(B) o2#1(B)] galat-aakhri=0 buffer-mein-atke=0 A/B=11/4\nkeyed      likhe=15 ulte-kram=0 galat-aakhri=0 buffer-mein-atke=0 A/B=11/4\nbuffer     likhe=15 ulte-kram=0 galat-aakhri=0 buffer-mein-atke=0 A/B=4/11\nbuffer-gap likhe=12 ulte-kram=0 galat-aakhri=o2=paid buffer-mein-atke=2 A/B=2/10"
        },
        {
          "text": "Wahi race nakli ghadi par, ek order.",
          "cmd": "npm start -- ex0-slowmo --story order --mode shared",
          "expect": "story=order mode=shared | nakli ghadi; lab ke tay ms\n  0 ms  o1 ki 5 haalatein line mein (placed → delivered) | o1=— line=5\n  0 ms  A ne #1 uthaya | o1=— line=5\n  0 ms  B ne #2 uthaya | o1=— line=5\n  5 ms  A ne #1 (placed) likha | o1=placed line=4\n  5 ms  A ne #3 uthaya | o1=placed line=4\n 10 ms  A ne #3 (packed) likha | o1=packed line=3\n 10 ms  A ne #4 uthaya | o1=packed line=3\n 15 ms  A ne #4 (shipped) likha | o1=shipped line=2\n 15 ms  A ne #5 uthaya | o1=shipped line=2\n 20 ms  A ne #5 (delivered) likha | o1=delivered line=1\n 40 ms  B ne #2 (paid) likha | o1=paid line=0"
        }
      ],
      "observe": {
        "q": "13 runs mein shared ke ulte kram har baar 2–3, par galat aakhri haalat sirf ek run mein aayi; baaki 12 mein 0. Is 0 se kya samjhoge?",
        "choices": [
          "Race har baar dikhe zaroori nahi — test pass ho kar bhi bug production mein rehta hai",
          "Galat aakhri 0 wale 12 runs sahi the — shared mode zyadatar surakshit chalta hai",
          "13 mein se sirf ek run bigda, toh production mein bhi bug utna hi kam aayega"
        ],
        "answer": 0,
        "hint": "Galat aakhri 0 wale runs mein ulte kram ki ginti kya thi?",
        "explain": "Ulte kram har run mein hua (2–3); 12 runs mein purani khabar aakhri na hone se aakhri haalat sahi bach gayi. Timing ki race kabhi dikhti hai, kabhi nahi — ek pass hua test saboot nahi. Keyed aur buffer mein ulte kram har run 0.",
        "choiceExplanations": [
          "Ulte kram har run mein hua (2–3); 12 runs mein purani khabar aakhri na hone se aakhri haalat sahi bach gayi. Timing ki race kabhi dikhti hai, kabhi nahi — ek pass hua test saboot nahi. Keyed aur buffer mein ulte kram har run 0.",
          "12 runs mein bhi ulte kram mein likha gaya; bas aakhri likhne wala message sahi nikla. Agla run alag ho sakta hai.",
          "13 runs koi niyam nahi banate. Load, machine aur timing badlein toh ginti badlegi."
        ]
      },
      "lesson": "Competing consumers kram nahi bachate. Bug timing par tika hai, isliye kabhi-kabhi dikhta hai — aur kabhi-kabhi dikhne wala bug khatarnak hai. Ilaaj agle level mein: ek key ek consumer, ya kram jaanch ke likhna."
    }
  ],
  "interview": {
    "title": "Interview Round — teen race conditions",
    "instructions": "Pehle socho: kitne consumers, kaunsi timing, kya dobara aaya. Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Order status events ek RabbitMQ queue par aate hain; 4 consumers. Kabhi-kabhi delivered order \"shipped\" dikhta hai. Logs mein shipped wala event delivered ke baad likha gaya. Wajah?",
        "choices": [
          "Competing consumers alag raftaar se chale; purana event baad mein likha gaya",
          "RabbitMQ ne events ulte kram mein publish kiye, kyunki queue FIFO nahi hoti",
          "Delivered event duplicate tha, isliye DB ne delivered ko mita kar shipped rakha",
          "Consumers ki ghadiyan alag thi, isliye DB ne galat time par likha shipped rakha"
        ],
        "answer": 0,
        "explain": "Queue messages FIFO deti hai, par kai consumers alag raftaar se kaam karte hain — dheema consumer purani khabar baad mein likh sakta hai. RabbitMQ docs: kai consumers par \"any redelivery can change order\". Ilaaj: ek order ke events ek waqt ek consumer ko, ya likhte waqt kram jaancho.",
        "choiceExplanations": [
          "Queue messages FIFO deti hai, par kai consumers alag raftaar se kaam karte hain — dheema consumer purani khabar baad mein likh sakta hai. RabbitMQ docs: kai consumers par \"any redelivery can change order\". Ilaaj: ek order ke events ek waqt ek consumer ko, ya likhte waqt kram jaancho.",
          "Queue FIFO mein deti hai. Kram consumers ke alag-alag raftaar se likhne mein toota.",
          "Duplicate event DB se purani haalat nahi mitata. Purana event naye ke baad likha gaya.",
          "DB ne aakhri likhi value rakhi. Ghadi nahi, likhne ka kram dikkat thi."
        ]
      },
      {
        "q": "Payment consumer charge likhne ke baad, ack se pehle crash hua. Restart ke baad customer ka do baar paisa kata. Broker ka kya role tha?",
        "choices": [
          "Ack nahi mila toh broker ne dobara diya — duplicate consumer ko sambhalna tha",
          "Broker ne galti se message do baar publish kiya — isliye broker hi badal do",
          "Producer ko ack nahi mila toh producer ne ek naya payment bana diya",
          "Crash ke baad broker ne DB ka pehla charge mita diya, phir naya likhwaya"
        ],
        "answer": 0,
        "explain": "Ack na aaye toh broker message dobara deta hai — at-least-once delivery ka yahi matlab hai. RabbitMQ docs: consumers \"must be prepared to handle redeliveries\". Consumer ka ack aur producer ka publisher confirm alag cheezein hain.",
        "choiceExplanations": [
          "Ack na aaye toh broker message dobara deta hai — at-least-once delivery ka yahi matlab hai. RabbitMQ docs: consumers \"must be prepared to handle redeliveries\". Consumer ka ack aur producer ka publisher confirm alag cheezein hain.",
          "Broker ne theek kaam kiya: ack nahi mila toh dobara diya. Broker badalne se ye nahi badalta.",
          "Consumer ka ack broker ko jaata hai, producer ko nahi. Producer ka publisher confirm alag hai.",
          "Broker DB ko nahi chhoota. Pehla charge DB mein wahin raha."
        ]
      }
    ]
  },
  "success": [
    "Competing consumers se ulta kram kaise banta hai, dikha sakte ho",
    "Lost update aur phantom failure ka matlab aur nuksaan bata sakte ho",
    "Race ka kabhi-kabhi dikhna kyun khatarnak hai, samjha sakte ho"
  ],
  "cards": [
    {
      "front": "Competing consumers kram bachate hain?",
      "back": "Nahi. Line FIFO ho tab bhi alag raftaar se purani khabar baad mein likh sakti hai."
    },
    {
      "front": "Lost update kya hai?",
      "back": "Do consumers ek hi purani value padh ke likhte hain; ek update kho jaata hai. Lab: 20 mein se 10."
    },
    {
      "front": "Phantom failure?",
      "back": "Kaam ho gaya, ack nahi gaya; broker ne dobara diya aur kaam do baar hua. Lab: p1 do baar kata."
    }
  ]
}
]);
})();
