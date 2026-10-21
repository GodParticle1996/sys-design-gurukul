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
              "Abhi nahi. Notify 0 aur notify pending 1 hai",
              "Haan, 202 matlab sab kaam poore",
              "Haan, publish ne SMS bhej diya"
            ],
            "answer": 0,
            "hint": "Notify ki poore aur pending rows saath dekho.",
            "explain": "Publisher ka jawab aur consumer ki completion alag events hain."
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
              "Read copy deta hai; kaam ke baad ack aane par entry hategi",
              "Pending ki ginti galat hai",
              "Read hote hi entry permanently delete ho gayi"
            ],
            "answer": 0,
            "hint": "Is lab mein read() aur ack() alag functions hain.",
            "explain": "Padhna aur kaam poora karna alag hain. Ack jaldi diya toh failure ke baad kaam chhoot sakta hai."
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
              "Apni line mein pending 1 hai; kitchen ka ack notify ko nahi chhoota",
              "Dono copies hati",
              "Notify bhi poora ho gaya"
            ],
            "answer": 0,
            "hint": "Kis subscription ka ack tha?",
            "explain": "Har subscription ki apni progress hai. Ek consumer ka kaam doosre consumer ki completion nahi."
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
      "goal": "Yeh RabbitMQ ki official documentation se hai; is lab mein RabbitMQ chalaya nahi gaya. Apne lab ka fanout code alag hai. Sources: <a href=\"https://www.rabbitmq.com/tutorials/tutorial-three-javascript\" target=\"_blank\" rel=\"noopener\">Publish/Subscribe</a> · <a href=\"https://www.rabbitmq.com/tutorials/tutorial-two-javascript\" target=\"_blank\" rel=\"noopener\">Work Queues</a>.",
      "steps": [
        {
          "title": "1. Ek task do workers mein baantna ho?",
          "say": "RabbitMQ ke Work Queues tutorial ke mutabiq ek queue ka kaam workers mein banta hai. Yeh ek hi tarah ke kaam ke workers hain. Do workers jodne ka matlab har worker ko har event ki alag copy milna nahi."
        },
        {
          "title": "2. Kitchen aur notify dono ko khabar chahiye?",
          "say": "RabbitMQ ke Publish/Subscribe tutorial mein fanout exchange apne se judi har queue ko copy deta hai. Is lab mein <b>kitchen</b> aur <b>notify</b> alag subscription names hain. Ek queue ke do workers se dono business kaam karwana alag design hai.",
          "ask": {
            "q": "Kitchen bhi har order dekhe aur notify bhi. Kaisa bantwara chahiye?",
            "choices": [
              "Do alag subscriptions ki do copies; har subscription apna ack kare",
              "Ek shared queue, dono koi bhi task utha lein",
              "Kitchen ack kare toh notify ka kaam bhi poora maan lo"
            ],
            "answer": 0,
            "hint": "Kaam baant rahe ho, ya khabar ki copies baant rahe ho?",
            "explain": "Alag business reactions ke liye alag progress chahiye. Isliye is lab mein alag queues hain."
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
          "Nahi. Notify offline par poore 0, pending 4 the; worker lautne par 4 poore hue",
          "Haan, 202 hi SMS delivery ka saboot hai",
          "Haan, broker publish karte hi saare effects kar deta hai"
        ],
        "answer": 0,
        "explain": "Direct median 248–250 ms, events 4–7 ms: API response ki measurement hai. Sinks real SMS nahi bhejte, IDs memory mein rakhte hain."
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
          "Nahi; notify ki apni copy aur apna ack baaki hai",
          "Haan; kisi ek ka ack kaafi hai",
          "Haan; producer ko 202 mil chuka hai"
        ],
        "answer": 0,
        "explain": "Alag subscriptions alag business kaam karti hain. Kitchen ki progress notify ki progress nahi."
      },
      {
        "q": "Is lab ke workers broker ko HTTP se poll karte hain. Kya yeh events wala flow nahi raha?",
        "choices": [
          "Flow ab bhi events par hai; HTTP/polling delivery ka tareeka hai",
          "Haan, events mein HTTP mana hai",
          "Haan, events ko hamesha WebSocket chahiye"
        ],
        "answer": 0,
        "explain": "Business ke wait aur khabar ke contract ko transport ke naam se mat milao."
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
