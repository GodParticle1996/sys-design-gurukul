/* Playlist · 2 EDA Core. Source credit: Software Developer Diaries,
   A Beginner's Guide to Event-Driven Architecture (RojKJnF_WWQ).
   Numbers: docker-labs/44-event-driven/captures; source code byte-checked. */
(function () {
const HERO = [{"id": "order", "icon": "🧾", "label": "order", "x": 140, "y": 105}, {"id": "line", "icon": "📬", "label": "alag lines", "x": 445, "y": 105}, {"id": "work", "icon": "🍳", "label": "alag kaam", "x": 750, "y": 105}];
const EDGES = [{"from": "order", "to": "line"}, {"from": "line", "to": "work"}];
VISUALS["ed-kyun"] = { t: "Ek order ka jawab notification ke wait se kyun bandha? Pehle problem, phir naam.", html: SD.viz.svg(HERO, EDGES, { nodes: { order: {tone:'acc',badge:'order save'}, line: {tone:'slow',badge:'apni-apni copy'}, work: {tone:'ok',badge:'kaam + ack'} } }, {w:890,h:215}) };
SD.registerLevels('sdd-eda', [
{
  "id": "ed-kyun",
  "icon": "🧾",
  "group": "📣 Event-Driven Architecture",
  "title": "EDA 1 · Kyun — message band, par order kyun atka?",
  "badge": "Parchi Shishya",
  "objectives": [
    "Notification band ho toh order ka jawab kyun rukta hai?",
    "503 ke baad bhi order save kaise reh gaya?",
    "Accepted aur kaam poora hone mein kya farak hai?"
  ],
  "lesson": [
    "<h3>🍽️ Thali le li. Ab message wale ka intezaar?</h3><p>Asha dhabe par order deti hai. Counter parchi rakh leta hai. Rasoi ne parchi le li. Par counter Asha ko tab tak jawab nahi deta jab tak message wala \"bhej diya\" na kahe.</p><p>Message wala band hai. Ab Asha ko kya dikhna chahiye?</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "🧾 Pehle seedhe calls: notification ne order ko kyun roka?",
      "goal": "Sawaal: notification band ho toh kya order bhi fail dikhna chahiye? Yeh tools/slowmo.js ka fixed-clock run hai. 100 ms kitchen aur 1000 ms failed notify lab ke tay delays hain.",
      "nodes": [
        {
          "id": "app",
          "icon": "🧾",
          "label": "order-api",
          "x": 145,
          "y": 90
        },
        {
          "id": "db",
          "icon": "🗃️",
          "label": "orders",
          "x": 745,
          "y": 90
        },
        {
          "id": "kitchen",
          "icon": "🍳",
          "label": "kitchen",
          "x": 145,
          "y": 240
        },
        {
          "id": "notify",
          "icon": "📨",
          "label": "notify",
          "x": 745,
          "y": 240
        }
      ],
      "edges": [
        {
          "from": "app",
          "to": "db"
        },
        {
          "from": "app",
          "to": "kitchen"
        },
        {
          "from": "app",
          "to": "notify"
        }
      ],
      "viz": {
        "w": 890,
        "h": 350,
        "focus": [
          "app",
          "kitchen"
        ]
      },
      "vars": [
        {
          "id": "saved",
          "label": "Order save"
        },
        {
          "id": "kitchen",
          "label": "Kitchen ne liye"
        },
        {
          "id": "notify",
          "label": "Notify poore"
        },
        {
          "id": "reply",
          "label": "Asha ko jawab"
        }
      ],
      "steps": [
        {
          "title": "Asha ne order #1 bheja",
          "clock": "0.00 s",
          "say": "Asha ne thali ka order bheja. KhanaKart ka rule: pehle order rakho, phir kitchen ko bolo, phir notification bhejo. Sabke jawab ke baad Asha ko jawab.",
          "nodes": {
            "app": {
              "tone": "busy",
              "badge": "jawab ruka hai"
            },
            "db": {
              "tone": "idle",
              "badge": "saved 0"
            },
            "kitchen": {
              "tone": "idle",
              "badge": "poore 0"
            },
            "notify": {
              "tone": "idle",
              "badge": "abhi baaki"
            }
          },
          "vars": {
            "saved": "0",
            "kitchen": "0",
            "notify": "0",
            "reply": "intezaar"
          }
        },
        {
          "title": "Order #1 save hua",
          "clock": "0.00 s",
          "say": "Order #1 memory mein save hua. Abhi kitchen ko kuch nahi mila. App ka jawab abhi ruka hai.",
          "nodes": {
            "app": {
              "tone": "busy",
              "badge": "jawab ruka hai"
            },
            "db": {
              "tone": "ok",
              "badge": "saved 1"
            },
            "kitchen": {
              "tone": "idle",
              "badge": "poore 0"
            },
            "notify": {
              "tone": "idle",
              "badge": "abhi baaki"
            }
          },
          "vars": {
            "saved": "1",
            "kitchen": "0",
            "notify": "0",
            "reply": "intezaar"
          },
          "flows": [
            {
              "from": "app",
              "to": "db",
              "label": "save",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "Kitchen ne #1 liya",
          "clock": "0.10 s",
          "say": "Kitchen ne order le liya. Ab app notification ke jawab ka intezaar karega. Kitchen ka kaam ho chuka hai.",
          "nodes": {
            "app": {
              "tone": "busy",
              "badge": "jawab ruka hai"
            },
            "db": {
              "tone": "ok",
              "badge": "saved 1"
            },
            "kitchen": {
              "tone": "ok",
              "badge": "poore 1"
            },
            "notify": {
              "tone": "idle",
              "badge": "abhi baaki"
            }
          },
          "vars": {
            "saved": "1",
            "kitchen": "1",
            "notify": "0",
            "reply": "intezaar"
          },
          "flows": [
            {
              "from": "app",
              "to": "kitchen",
              "tone": "ok"
            }
          ],
          "ask": {
            "q": "Kitchen ne #1 le liya. App abhi notify ka jawab dekh raha hai. Kya Asha ko order ka jawab mil chuka hai?",
            "choices": [
              "Nahi. Is flow mein app notify ka jawab bhi aane tak rukta hai",
              "Haan, kitchen ne le liya toh app ka jawab bhi aa gaya",
              "Haan, save hote hi jawab laut gaya"
            ],
            "answer": 0,
            "hint": "Code ka kram dekho: save → kitchen → notify → response.",
            "explain": "Notify ka wait Asha ke response ke raaste mein hai. Kaam alag hai, par wait sabko baandh raha hai."
          }
        },
        {
          "title": "Notify ka jawab fail",
          "clock": "1.10 s",
          "say": "Notify band hai. Notify ke failed jawab ka intezaar poora hua. App ka direct flow error mein chala gaya.",
          "nodes": {
            "app": {
              "tone": "busy",
              "badge": "jawab ruka hai"
            },
            "db": {
              "tone": "ok",
              "badge": "saved 1"
            },
            "kitchen": {
              "tone": "ok",
              "badge": "poore 1"
            },
            "notify": {
              "tone": "bad",
              "badge": "band"
            }
          },
          "vars": {
            "saved": "1",
            "kitchen": "1",
            "notify": "0",
            "reply": "intezaar"
          }
        },
        {
          "title": "Asha ko jawab: order save tha, par HTTP fail",
          "clock": "1.10 s",
          "say": "Asha ko HTTP 503 mila. Par order save hai aur kitchen ne order le liya. Error ka matlab yahan \"kuch bhi nahi hua\" nahi.",
          "nodes": {
            "app": {
              "tone": "bad",
              "badge": "503"
            },
            "db": {
              "tone": "ok",
              "badge": "saved 1"
            },
            "kitchen": {
              "tone": "ok",
              "badge": "poore 1"
            },
            "notify": {
              "tone": "bad",
              "badge": "band"
            }
          },
          "vars": {
            "saved": "1",
            "kitchen": "1",
            "notify": "0",
            "reply": "503"
          },
          "ask": {
            "q": "Asha ko 503 mila. Kya #1 ko bina pehchaan badle dobara bhejna hamesha surakshit hai?",
            "choices": [
              "Nahi. Pehle #1 ka status dekho; order aur kitchen ka effect pehle hi ho chuka hai",
              "Haan, 503 ka matlab order bana hi nahi",
              "Haan, failed response pehle ke effects mita deta hai"
            ],
            "answer": 0,
            "hint": "Saved aur kitchen ki ginti dekho.",
            "explain": "Request fail hui, par pehle ke effects rollback nahi hue. Retry ke liye stable order ID aur duplicate se bachav chahiye."
          }
        }
      ],
      "lesson": "🎯 <b>Asli baat:</b> notification ka intezaar order ke jawab se jud gaya. Response fail hone se pehle ka kaam apne aap wapas nahi hua."
    },
    {
      "type": "cards",
      "title": "🍽️ Dhabe ki parchi — pehle sawaal, phir naam",
      "goal": "Counter par parchi banao. Rasoi aur message bhejne wale ko apna-apna kaam lene do.",
      "steps": [
        {
          "title": "1. Message wala gayab ho toh grahak ko counter par rokein?",
          "say": "Dhabe par counter ne parchi likh di. Rasoi parchi le sakti hai. Message bhejne wala abhi nahi hai. Kya message wale ke lautne tak grahak ko counter par rakhna zaroori hai?",
          "ask": {
            "q": "Agar order lena aur notification bhejna alag promises hain, kya badlein?",
            "choices": [
              "Order ka jawab notification ke poora hone se alag karo",
              "Saara order reject kar do",
              "Parchi bina rakhe success keh do"
            ],
            "answer": 0,
            "hint": "Parchi lene aur message bhejne ki zimmedari alag socho.",
            "explain": "Counter order rakhe aur accepted kahe. Notification ka pending kaam alag line mein rakho."
          }
        },
        {
          "title": "2. \"Liya\" aur \"poora\" ek baat hain?",
          "say": "Parchi lena khana tayyar hona nahi. Asha ko <b>accepted</b> dikhega; <b>khana tayyar</b> tabhi jab kitchen ka kaam poora ho. Naya flow agle level mein isi promise ko dikhayega."
        },
        {
          "title": "3. Is parchi aur khabar ko technical naam kya dein?",
          "say": "<b>Event</b> = ho chuki baat ki khabar: <code>OrderPlaced</code>. Order lene wala <b>producer</b>. Khabar rakhne aur baantne wala <b>broker</b>. Apna kaam lene wala <b>consumer</b>. Aise events par alag kaam chalane ka andaaz: <b>Event-Driven Architecture</b>."
        }
      ],
      "lesson": "🎯 <b>Asli baat:</b> Pehle business ka promise tay karo: order accepted hua, ya kitchen aur message ka kaam bhi poora hua? Naam badalne se yeh farak nahi mitta."
    },
    {
      "type": "docker",
      "title": "🧪 Wahi dikkat apne terminal mein",
      "project": "44-event-driven",
      "exercise": "ex0-slowmo",
      "goal": "Fixed clock par wahi save → kitchen → notify flow chalao. Koi service chalu nahi karni.",
      "why": "Node 18+ chahiye. Neeche ka output isi lab ke captured run se hai; Docker ki compose file chalayi nahi gayi.",
      "steps": [
        {
          "text": "Lab folder se seedhe calls ka slow motion.",
          "cmd": "cd docker-labs/44-event-driven && node tools/slowmo.js --mode direct --fast",
          "expect": "0.00 s  Asha ne order #1 bheja | saved=0 kitchen=0 notify=0 pending=0/0 HTTP=intezaar\n0.00 s  Order #1 save hua | saved=1 kitchen=0 notify=0 pending=0/0 HTTP=intezaar\n0.10 s  Kitchen ne #1 liya | saved=1 kitchen=1 notify=0 pending=0/0 HTTP=intezaar\n1.10 s  Notify ka jawab fail | saved=1 kitchen=1 notify=0 pending=0/0 HTTP=intezaar\n1.10 s  Asha ko jawab: order save tha, par HTTP fail | saved=1 kitchen=1 notify=0 pending=0/0 HTTP=503"
        },
        {
          "text": "Ab wahi order alag lines se: isi lab folder mein.",
          "cmd": "node tools/slowmo.js --mode events --fast",
          "expect": "0.00 s  Asha ne order #1 bheja | saved=0 kitchen=0 notify=0 pending=0/0 HTTP=intezaar\n0.00 s  Order #1 save hua | saved=1 kitchen=0 notify=0 pending=0/0 HTTP=intezaar\n0.01 s  OrderPlaced ki do copies line mein | saved=1 kitchen=0 notify=0 pending=1/1 HTTP=intezaar\n0.01 s  Asha ko accepted mila; kitchen/notify abhi baaki | saved=1 kitchen=0 notify=0 pending=1/1 HTTP=202\n0.02 s  Kitchen ne apni copy padhi; entry abhi line mein | saved=1 kitchen=0 notify=0 pending=1/1 HTTP=202\n0.12 s  Kitchen ka kaam + ack; sirf kitchen ki copy hati | saved=1 kitchen=1 notify=0 pending=0/1 HTTP=202\n0.12 s  Notify band hai; notify ki copy line mein ruki | saved=1 kitchen=1 notify=0 pending=0/1 HTTP=202\n1.50 s  Notify wapas; purani copy padhi | saved=1 kitchen=1 notify=0 pending=0/1 HTTP=202\n1.60 s  Notify ka kaam + ack; notify ki copy bhi hati | saved=1 kitchen=1 notify=1 pending=0/0 HTTP=202"
        }
      ],
      "observe": {
        "q": "Run ke aakhir mein saved 1 aur kitchen 1 hai, phir bhi 503. Dikkat kahan bani?",
        "choices": [
          "Order ke jawab mein notify ka wait aur failure bhi jud gaye",
          "Order save hi nahi hua",
          "Kitchen ne order kabhi dekha nahi"
        ],
        "answer": 0,
        "explain": "1.10 s par failed response ke pehle dono effects ho chuke hain."
      },
      "lesson": "Response ki failure aur business ke effects ko alag dekhna shuru karo."
    }
  ],
  "interview": {
    "title": "Interview Round — ek order ka safar",
    "instructions": "Pehle KhanaKart ka haal socho. Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Order saved, kitchen done, notify failed. Kya response 503 ka matlab order nahi bana?",
        "choices": [
          "Nahi; failure se pehle ke effects reh sakte hain",
          "Haan; HTTP failure sab wapas kar deta hai",
          "Haan; kitchen ne bas mazaak kiya"
        ],
        "answer": 0,
        "explain": "Lab mein saved 1 aur kitchen 1 the. Response ne pehle ke effects nahi mitaye."
      },
      {
        "q": "Accepted ka sahi business matlab kya rakhein?",
        "choices": [
          "Order receive/save karke aage ke kaam ke liye liya; completion alag state hai",
          "Khana aur SMS dono poore",
          "Payment aur stock dono confirmed, chahe jaanch nahi ki"
        ],
        "answer": 0,
        "explain": "API utna hi vaada kare jitna API ne sach mein kiya."
      }
    ]
  },
  "success": [
    "Notification ka wait order ke jawab se kaise judta hai, dikha sakte ho",
    "Failed response ke baad bache effects pehchaan sakte ho",
    "Accepted aur completed ka promise alag rakh sakte ho"
  ],
  "cards": [
    {
      "front": "Event kya hai?",
      "back": "Ho chuki baat ki khabar, jaise OrderPlaced. Subscriber us khabar par apna kaam chunta hai."
    },
    {
      "front": "503 aaya toh kuch nahi hua?",
      "back": "Zaroori nahi. Is lab mein order save aur kitchen ka kaam ho chuka tha."
    },
    {
      "front": "Accepted ya completed?",
      "back": "Accepted: kaam lene ka jawab. Completed: kaam poora hone ka alag saboot."
    }
  ]
}
]);
})();
