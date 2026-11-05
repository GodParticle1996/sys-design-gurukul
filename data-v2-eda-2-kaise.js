/* Playlist · 2 EDA Core. Source credit: Software Developer Diaries,
   A Beginner's Guide to Event-Driven Architecture (RojKJnF_WWQ).
   Numbers: docker-labs/44-event-driven/captures; source code byte-checked. */
(function () {
const HERO = [{"id": "order", "icon": "🧾", "label": "order", "x": 140, "y": 105}, {"id": "line", "icon": "📬", "label": "alag lines", "x": 445, "y": 105}, {"id": "work", "icon": "🍳", "label": "alag kaam", "x": 750, "y": 105}];
const EDGES = [{"from": "order", "to": "line"}, {"from": "line", "to": "work"}];
VISUALS["ed-kaise"] = { t: "Accepted, pending, processed aur ack ko alag dekho. Har subscription ki progress apni hai.", html: SD.viz.svg(HERO, EDGES, { nodes: { order: {tone:'acc',badge:'order save'}, line: {tone:'slow',badge:'apni-apni copy'}, work: {tone:'ok',badge:'kaam + ack'} } }, {w:890,h:215}) };
SD.registerLevels('sdd-eda', [
{
  "id": "ed-kaise",
  "icon": "📬",
  "group": "📣 Event-Driven Architecture",
  "title": "EDA 2 · Kaise — ek khabar, har kaam ki apni copy",
  "badge": "Khabar Sipahi",
  "objectives": [
    "Publish ke baad kitchen aur notify ki progress alag kaise rehti hai?",
    "Entry padhna aur ack dena alag kyun hain?",
    "Ek shared queue aur do subscriptions mein kya farak hai?"
  ],
  "lesson": [
    "<h3>📬 Counter ki parchi ab do jagah</h3><p>Order save hua. Counter khabar deta hai: <b>OrderPlaced</b>. Kitchen apna kaam lega. Notify apna. Notify band ho toh kitchen ko notify ka intezaar kyun ho?</p><p>Har click par ek event. State table se dekho: khabar mili, ya kaam bhi poora hua?</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "📬 Har click par ek parchi ka safar",
      "goal": "Wahi #1, wahi code. Fixed-clock run: API ke 202, kitchen ke ack aur notify ke ack ko alag dekho.",
      "nodes": [
        {
          "id": "app",
          "icon": "🧾",
          "label": "order-api",
          "x": 140,
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
          "id": "db",
          "icon": "🗃️",
          "label": "orders",
          "x": 140,
          "y": 240
        },
        {
          "id": "kitchen",
          "icon": "🍳",
          "label": "kitchen",
          "x": 445,
          "y": 240
        },
        {
          "id": "notify",
          "icon": "📨",
          "label": "notify",
          "x": 750,
          "y": 240
        }
      ],
      "edges": [
        {
          "from": "app",
          "to": "bus"
        },
        {
          "from": "app",
          "to": "db"
        },
        {
          "from": "bus",
          "to": "kitchen"
        },
        {
          "from": "bus",
          "to": "notify"
        }
      ],
      "viz": {
        "w": 890,
        "h": 350,
        "focus": [
          "bus"
        ]
      },
      "vars": [
        {
          "id": "saved",
          "label": "Orders save"
        },
        {
          "id": "response",
          "label": "API ka jawab"
        },
        {
          "id": "kitchen",
          "label": "Kitchen poore"
        },
        {
          "id": "kitchenPending",
          "label": "Kitchen pending"
        },
        {
          "id": "notify",
          "label": "Notify poore"
        },
        {
          "id": "notifyPending",
          "label": "Notify pending"
        }
      ],
      "steps": [
        {
          "title": "Asha ne order #1 bheja",
          "clock": "0.00 s",
          "say": "Asha ka wahi order #1. Is baar kitchen aur notify ki alag subscription lines hain. Har line ka ek worker hai.",
          "nodes": {
            "app": {
              "tone": "busy",
              "badge": "intezaar"
            },
            "db": {
              "tone": "idle",
              "badge": "saved 0"
            },
            "bus": {
              "tone": "idle",
              "badge": "pending 0/0"
            },
            "kitchen": {
              "tone": "idle",
              "badge": "poore 0"
            },
            "notify": {
              "tone": "idle",
              "badge": "poore 0"
            }
          },
          "vars": {
            "saved": "0",
            "kitchen": "0",
            "notify": "0",
            "kitchenPending": "0",
            "notifyPending": "0",
            "response": "intezaar"
          }
        },
        {
          "title": "Order #1 save hua",
          "clock": "0.00 s",
          "say": "Order #1 save hua. Save ki copy aur event ki copy alag cheezein hain. Abhi kisi line mein event nahi.",
          "nodes": {
            "app": {
              "tone": "busy",
              "badge": "intezaar"
            },
            "db": {
              "tone": "ok",
              "badge": "saved 1"
            },
            "bus": {
              "tone": "idle",
              "badge": "pending 0/0"
            },
            "kitchen": {
              "tone": "idle",
              "badge": "poore 0"
            },
            "notify": {
              "tone": "idle",
              "badge": "poore 0"
            }
          },
          "vars": {
            "saved": "1",
            "kitchen": "0",
            "notify": "0",
            "kitchenPending": "0",
            "notifyPending": "0",
            "response": "intezaar"
          },
          "flows": [
            {
              "from": "app",
              "to": "db",
              "tone": "acc"
            }
          ]
        },
        {
          "title": "OrderPlaced ki do copies line mein",
          "clock": "0.01 s",
          "say": "Broker ne <code>OrderPlaced</code> ki ek copy kitchen ki line mein aur ek notify ki line mein rakhi. Dono pending hain. Publish ke jawab ka matlab abhi consumer ka kaam poora nahi.",
          "nodes": {
            "app": {
              "tone": "busy",
              "badge": "intezaar"
            },
            "db": {
              "tone": "ok",
              "badge": "saved 1"
            },
            "bus": {
              "tone": "slow",
              "badge": "pending 1/1"
            },
            "kitchen": {
              "tone": "idle",
              "badge": "poore 0"
            },
            "notify": {
              "tone": "idle",
              "badge": "poore 0"
            }
          },
          "vars": {
            "saved": "1",
            "kitchen": "0",
            "notify": "0",
            "kitchenPending": "1",
            "notifyPending": "1",
            "response": "intezaar"
          },
          "flows": [
            {
              "from": "app",
              "to": "bus",
              "tone": "acc"
            }
          ]
        },
        {
          "title": "Asha ko accepted mila; kitchen/notify abhi baaki",
          "clock": "0.01 s",
          "say": "API ne <b>202 accepted</b> diya. Kitchen 0, notify 0. Asha ka response ab notify ke lautne ka intezaar nahi karta.",
          "nodes": {
            "app": {
              "tone": "ok",
              "badge": "202"
            },
            "db": {
              "tone": "ok",
              "badge": "saved 1"
            },
            "bus": {
              "tone": "slow",
              "badge": "pending 1/1"
            },
            "kitchen": {
              "tone": "idle",
              "badge": "poore 0"
            },
            "notify": {
              "tone": "idle",
              "badge": "poore 0"
            }
          },
          "vars": {
            "saved": "1",
            "kitchen": "0",
            "notify": "0",
            "kitchenPending": "1",
            "notifyPending": "1",
            "response": "202"
          },
          "ask": {
            "q": "Asha ko 202 mil gaya. Kya notification bhej di gayi?",
            "choices": [
              "Notify poore 0 hain, aur pending 1",
              "202 ka matlab sab kaam poore ho gaye",
              "Publish karte hi worker ne SMS bhej diya",
            ],
            "answer": 0,
            "hint": "Notify ki poore aur pending rows saath dekho.",
            "explain": "202 batata hai ki request le li gayi; ginti dikhati hai ki notify ka kaam abhi pending hai.",
            "choiceExplanations": [
              "202 batata hai ki request le li gayi; ginti dikhati hai ki notify ka kaam abhi pending hai.",
              "202 = request le li gayi. Kaam poora hone ki raseed nahi.",
              "Publish aur consumer ka kaam alag kadam hain. Ginti notify pending 1 dikhati hai.",
            ],
          }
        },
        {
          "title": "Kitchen ne apni copy padhi; entry abhi line mein",
          "clock": "0.02 s",
          "say": "Kitchen ne apni entry padhi. Is lab ka <code>read()</code> entry nahi mitaata. Jab tak kaam + ack nahi, entry pending hai.",
          "nodes": {
            "app": {
              "tone": "ok",
              "badge": "202"
            },
            "db": {
              "tone": "ok",
              "badge": "saved 1"
            },
            "bus": {
              "tone": "slow",
              "badge": "pending 1/1"
            },
            "kitchen": {
              "tone": "idle",
              "badge": "poore 0"
            },
            "notify": {
              "tone": "idle",
              "badge": "poore 0"
            }
          },
          "vars": {
            "saved": "1",
            "kitchen": "0",
            "notify": "0",
            "kitchenPending": "1",
            "notifyPending": "1",
            "response": "202"
          },
          "flows": [
            {
              "from": "bus",
              "to": "kitchen",
              "tone": "acc"
            }
          ],
          "ask": {
            "q": "Kitchen ne entry padh li. Kitchen pending abhi bhi 1 kyun?",
            "choices": [
              "Read ne copy di hai; kaam ke baad ack aane par hi entry hategi",
              "Read ne entry mita di; pending ki ginti purani reh gayi, bug hai",
              "Read ne notify ka ack bhi isi entry par saath mein kar diya",
            ],
            "answer": 0,
            "hint": "Is lab mein read() aur ack() alag functions hain.",
            "explain": "Is lab ka broker read ke baad entry rakhta hai; ack kaam poora hone ka nishaan hai. read() aur ack() alag functions hain.",
            "choiceExplanations": [
              "Is lab ka broker read ke baad entry rakhta hai; ack kaam poora hone ka nishaan hai. read() aur ack() alag functions hain.",
              "Is lab ka read() entry nahi mitaata — mitane ka kaam ack() karta hai.",
              "Har subscription ka ack alag hai. Kitchen ka read notify ko nahi chhoota.",
            ],
          }
        },
        {
          "title": "Kitchen ka kaam + ack; sirf kitchen ki copy hati",
          "clock": "0.12 s",
          "say": "Kitchen ne #1 liya, phir ack bheja. Broker ne sirf kitchen ki copy hataayi. Notify ki pending copy apni line mein hai.",
          "nodes": {
            "app": {
              "tone": "ok",
              "badge": "202"
            },
            "db": {
              "tone": "ok",
              "badge": "saved 1"
            },
            "bus": {
              "tone": "slow",
              "badge": ""
            },
            "kitchen": {
              "tone": "ok",
              "badge": "poore 1"
            },
            "notify": {
              "tone": "idle",
              "badge": "poore 0"
            }
          },
          "vars": {
            "saved": "1",
            "kitchen": "1",
            "notify": "0",
            "kitchenPending": "0",
            "notifyPending": "1",
            "response": "202"
          },
          "flows": [
            {
              "from": "kitchen",
              "to": "bus",
              "tone": "ok"
            }
          ],
          "ask": {
            "q": "Kitchen ka ack aa gaya. Notify ki copy ka kya hua?",
            "choices": [
              "Notify ki copy apni line mein pending rahegi — kitchen ka ack alag hai",
              "Event ID ek hai, toh dono subscriptions ki copies ek saath hat jaayengi",
              "Kitchen ka ack notify ki delivery ki raseed bhi maan li jaayegi, bas",
            ],
            "answer": 0,
            "hint": "Kis subscription ka ack tha?",
            "explain": "Kitchen ka ack sirf kitchen ki line ka kaam poora karta hai; notify ko apna kaam aur apna ack chahiye.",
            "choiceExplanations": [
              "Kitchen ka ack sirf kitchen ki line ka kaam poora karta hai; notify ko apna kaam aur apna ack chahiye.",
              "Event ID ek hone se subscriptions ki state nahi judti. Har line apni.",
              "Doosre consumer ka kaam notify ke SMS ka saboot nahi.",
            ],
          }
        },
        {
          "title": "Notify band hai; notify ki copy line mein ruki",
          "clock": "0.12 s",
          "say": "Notify band hai. Kitchen ka kaam poora, notify ka kaam pending. Yahi partial state app ko samajhni aur dikhani padegi.",
          "nodes": {
            "app": {
              "tone": "ok",
              "badge": "202"
            },
            "db": {
              "tone": "ok",
              "badge": "saved 1"
            },
            "bus": {
              "tone": "slow",
              "badge": "pending 0/1"
            },
            "kitchen": {
              "tone": "ok",
              "badge": "poore 1"
            },
            "notify": {
              "tone": "bad",
              "badge": "poore 0"
            }
          },
          "vars": {
            "saved": "1",
            "kitchen": "1",
            "notify": "0",
            "kitchenPending": "0",
            "notifyPending": "1",
            "response": "202"
          }
        },
        {
          "title": "Notify wapas; purani copy padhi",
          "clock": "1.50 s",
          "say": "Notify wapas aaya. Notify ne apni ruki copy padhi. API ko order dobara publish nahi karna pada.",
          "nodes": {
            "app": {
              "tone": "ok",
              "badge": "202"
            },
            "db": {
              "tone": "ok",
              "badge": "saved 1"
            },
            "bus": {
              "tone": "slow",
              "badge": "pending 0/1"
            },
            "kitchen": {
              "tone": "ok",
              "badge": "poore 1"
            },
            "notify": {
              "tone": "idle",
              "badge": "poore 0"
            }
          },
          "vars": {
            "saved": "1",
            "kitchen": "1",
            "notify": "0",
            "kitchenPending": "0",
            "notifyPending": "1",
            "response": "202"
          },
          "flows": [
            {
              "from": "bus",
              "to": "notify",
              "tone": "acc"
            }
          ]
        },
        {
          "title": "Notify ka kaam + ack; notify ki copy bhi hati",
          "clock": "1.60 s",
          "say": "Notify ka kaam poora, phir ack. Ab dono lines khaali. Asha ko accepted pehle mila tha; dono kaam ab poore hue.",
          "nodes": {
            "app": {
              "tone": "ok",
              "badge": "202"
            },
            "db": {
              "tone": "ok",
              "badge": "saved 1"
            },
            "bus": {
              "tone": "idle",
              "badge": ""
            },
            "kitchen": {
              "tone": "ok",
              "badge": "poore 1"
            },
            "notify": {
              "tone": "ok",
              "badge": "poore 1"
            }
          },
          "vars": {
            "saved": "1",
            "kitchen": "1",
            "notify": "1",
            "kitchenPending": "0",
            "notifyPending": "0",
            "response": "202"
          },
          "flows": [
            {
              "from": "notify",
              "to": "bus",
              "tone": "ok"
            }
          ]
        }
      ],
      "lesson": "🎯 <b>Asli baat:</b> publish → accepted, phir har consumer ka apna kaam → apna ack. Har copy ki progress alag hai."
    },
    {
      "type": "cards",
      "title": "📚 Ek queue ya har kaam ki apni queue?",
      "goal": "Ye baat RabbitMQ ki official documentation se hai; is lab mein RabbitMQ chalaya nahi gaya. Apne lab ka fanout code alag hai. Sources: <a href=\"https://www.rabbitmq.com/tutorials/tutorial-three-javascript\" target=\"_blank\" rel=\"noopener\">Publish/Subscribe</a> · <a href=\"https://www.rabbitmq.com/tutorials/tutorial-two-javascript\" target=\"_blank\" rel=\"noopener\">Work Queues</a>.",
      "steps": [
        {
          "title": "1. Ek task do workers mein baantna ho?",
          "say": "RabbitMQ ke Work Queues tutorial ke mutabiq ek queue ka kaam workers mein banta hai. Ye sab workers ek hi tarah ka kaam karte hain. Do workers jodne ka matlab har worker ko har event ki alag copy milna nahi."
        },
        {
          "title": "2. Kitchen aur notify dono ko khabar chahiye?",
          "say": "RabbitMQ ke Publish/Subscribe tutorial mein fanout exchange apne se judi har queue ko copy deta hai. Is lab mein <b>kitchen</b> aur <b>notify</b> alag subscription names hain. Ek queue ke do workers se dono business kaam karwana alag design hai.",
          "ask": {
            "q": "Kitchen bhi har order dekhe aur notify bhi. Kaisa bantwara chahiye?",
            "choices": [
              "Do alag subscriptions, do copies — har subscription apna ack kare",
              "Ek shared queue — kitchen aur notify mein jo pehle uthaye, wahi kare",
              "Ek hi ack — kitchen ack kare toh notify ka kaam bhi poora maano",
            ],
            "answer": 0,
            "hint": "Kaam baant rahe ho, ya khabar ki copies baant rahe ho?",
            "explain": "Dono ko har event chahiye toh alag subscriptions (queues) chahiye. Ek queue ke workers aapas mein kaam baant-te hain — har worker ko copy nahi milti.",
            "choiceExplanations": [
              "Dono ko har event chahiye toh alag subscriptions (queues) chahiye. Ek queue ke workers aapas mein kaam baant-te hain — har worker ko copy nahi milti.",
              "Ek queue ke workers kaam baant-te hain — har order ek hi worker ko milega, dono ko nahi.",
              "Do alag kaamon ka poora hona ek ack se saabit nahi hota.",
            ],
          }
        },
        {
          "title": "3. Khabar ka naam ya kisi ko diya hua kaam?",
          "say": "<code>OrderPlaced</code> kehta hai: order place ho chuka. Kitchen aur notify apne reactions chunte hain. <code>SendSMS</code> kisi receiver se kaam karne ki maang hai: command. Sirf spelling nahi—zimmedari aur completion ka promise bhi badalta hai."
        }
      ],
      "lesson": "🎯 <b>Asli baat:</b> Ek kaam ke workers mein bantwara aur alag kaamon tak khabar ki copies pahunchana alag baatein hain."
    },
    {
      "type": "docker",
      "title": "🌐 Ab actual HTTP par naapo",
      "project": "44-event-driven",
      "exercise": "ex1-compare",
      "goal": "Notify offline rakho. API ke response aur pending kaam ko alag naapo. Neeche teen runs mein se pehla output hai.",
      "why": "Node 18+ chahiye. Neeche ka output isi lab ke captured run se hai; Docker ki compose file chalayi nahi gayi.",
      "steps": [
        {
          "text": "Pehla terminal: broker, API aur dono workers.",
          "cmd": "cd docker-labs/44-event-driven && npm start ex1-compare"
        },
        {
          "text": "Doosra terminal: direct aur events flow.",
          "cmd": "cd docker-labs/44-event-driven && node tools/compare.js",
          "expect": "direct: HTTP 503/503/503/503 · median 250 ms\n  saved 4 · kitchen 4 · notify 0 · notify pending 0\nevents: HTTP 202/202/202/202 · median 7 ms\n  saved 4 · kitchen 4 · notify 0 · notify pending 4\n  notify wapas: 4 · pending 0"
        }
      ],
      "observe": {
        "q": "Events mein 202 ki median 4–7 ms thi. Kya chaar SMS bhi utne waqt mein bheje gaye?",
        "choices": [
          "Jawab tez tha, par notify worker band; 4 copies pending rahi",
          "API ka median hi SMS pahunchne ka samay bhi hota hai, wahi",
          "Broker ne band worker ka kaam bhi khud hi poora kar diya",
        ],
        "answer": 0,
        "explain": "Is run mein 202 tez tha (median 4–7 ms), par notify worker band hone se 4 copies pending rahi; worker lautne par 4 poore hue. Jawab ki latency aur poore kaam ki latency alag hain.",
        "choiceExplanations": [
          "Is run mein 202 tez tha (median 4–7 ms), par notify worker band hone se 4 copies pending rahi; worker lautne par 4 poore hue. Jawab ki latency aur poore kaam ki latency alag hain.",
          "Jawab ka samay aur poore kaam ka samay alag naap hain.",
          "Broker message rakhta hai, consumer ka kaam nahi karta.",
        ],
      },
      "lesson": "API latency aur end-to-end completion dono dekho. Tez acceptance ko tez completion mat samjho."
    }
  ],
  "interview": {
    "title": "Interview Round — ek order ka safar",
    "instructions": "Pehle KhanaKart ka haal socho. Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Kitchen ka ack aa gaya; notify band hai. OrderPlaced ki notify copy hata dein?",
        "choices": [
          "Notify ki copy rakho; notify ko apna kaam aur ack chahiye",
          "Kitchen ka kaam ho gaya, toh event ka saara kaam band",
          "API ne 202 de diya, toh producer ki zimmedari khatam",
        ],
        "answer": 0,
        "explain": "Notify subscription ka pending kaam kitchen ke ack se poora nahi hota. Consumers ki zimmedariyan alag hain.",
        "choiceExplanations": [
          "Notify subscription ka pending kaam kitchen ke ack se poora nahi hota. Consumers ki zimmedariyan alag hain.",
          "Har consumer ki zimmedari alag. Kitchen ka kaam notify ka kaam nahi.",
          "202 sabhi subscribers ke poore hone ka saboot nahi.",
        ],
      },
      {
        "q": "Is lab ke workers broker ko HTTP se poll karte hain. Kya flow ab bhi events wala hai?",
        "choices": [
          "Events hi hain; HTTP polling bas pahunchane ka tareeka hai",
          "HTTP poll laga toh flow RPC ban gaya, events nahi raha",
          "Events sirf hamesha khule WebSocket connection se bante",
        ],
        "answer": 0,
        "explain": "Event-driven ki pehchaan message ka contract aur producer-consumer ki dhili jodi hai; pahunchane ka tareeka HTTP bhi ho sakta hai.",
        "choiceExplanations": [
          "Event-driven ki pehchaan message ka contract aur producer-consumer ki dhili jodi hai; pahunchane ka tareeka HTTP bhi ho sakta hai.",
          "Event flow message ke contract se banta hai. Polling async events ke saath chal jaati hai.",
          "WebSocket ek tareeka hai, events ki shart nahi.",
        ],
      }
    ]
  },
  "success": [
    "Har subscription ki alag copy aur progress trace kar sakte ho",
    "Read, work aur ack ka kram chun sakte ho",
    "Work sharing aur khabar ki copies ka farak bata sakte ho"
  ],
  "cards": [
    {
      "front": "Publisher ka jawab kya saboot deta hai?",
      "back": "Is lab mein broker ne pending copies rakh li. Consumer ka kaam poora ya data durable hona prove nahi hota."
    },
    {
      "front": "Read aur ack?",
      "back": "Read entry deta hai. Kaam ke baad ack us subscription ki entry hataata hai."
    },
    {
      "front": "Work queue vs fanout?",
      "back": "Same kaam workers mein baanto: shared queue. Alag reactions ko har khabar chahiye: alag subscriptions ki copies."
    }
  ]
}
]);
})();
