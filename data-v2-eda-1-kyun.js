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
            "choices": ["Nahi; response notify ke await ke baad hai","Haan; kitchen ACK caller ko turant release karta","Haan; local save remaining awaits cancel karta"],
            "answer": 0,
            "hint": "Code ka kram dekho: save → kitchen → notify → response.",
            "explain": "Shown synchronous handler notify completion tak caller response hold karta hai. Kitchen completion is handler ke remaining await ko bypass nahi karti. Local persistence response control-flow ko cancel nahi karti."
          , choiceExplanations: ["Shown synchronous handler notify completion tak caller response hold karta hai.","Kitchen completion is handler ke remaining await ko bypass nahi karti.","Local persistence response control-flow ko cancel nahi karti."] }
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
            "choices": ["Pehle status aur idempotency se outcome resolve karo","503 ko missing order samjho; naya order ID bhejo","Same payload ko nayi key se bhejo; effect rollback tha"],
            "answer": 0,
            "hint": "Saved aur kitchen ki ginti dekho.",
            "explain": "Failed response ke pehle durable side effects ho sakte hain; identity preserve karke dedupe/status reconciliation chahiye. HTTP status transaction rollback ka universal guarantee nahi. New key prior side effect se dedupe relation tod sakti hai."
          , choiceExplanations: ["Failed response ke pehle durable side effects ho sakte hain; identity preserve karke dedupe/status reconciliation chahiye.","HTTP status transaction rollback ka universal guarantee nahi.","New key prior side effect se dedupe relation tod sakti hai."] }
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
            "choices": ["Acceptance ko notification completion se decouple karo","Notification failure par saved order bhi invalid maano","Notification ko ignore karke delivered status return karo"],
            "answer": 0,
            "hint": "Parchi lene aur message bhejne ki zimmedari alag socho.",
            "explain": "Business acceptance aur background notification ke separate promises/statuses define kar sakte ho; durable delivery design alag chahiye. Already saved/acted-on order ko nonexistent report karna ambiguity badhaata hai. Pending work ko delivered kehna API contract galat banata hai."
          , choiceExplanations: ["Business acceptance aur background notification ke separate promises/statuses define kar sakte ho; durable delivery design alag chahiye.","Already saved/acted-on order ko nonexistent report karna ambiguity badhaata hai.","Pending work ko delivered kehna API contract galat banata hai."] }
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
        "choices": ["Notify failure order response ke saath coupled thi","Save failure ke baad kitchen effect bhi absent tha","Kitchen capacity failure ne order save cancel kiya"],
        "answer": 0,
        "explain": "Trace saved/kitchen state completed dikhata hai, par awaited notify failure response ko 503 banaati hai. State counters save aur kitchen effect already confirm karte hain. No kitchen capacity failure given hai."
      , choiceExplanations: ["Trace saved/kitchen state completed dikhata hai, par awaited notify failure response ko 503 banaati hai.","State counters save aur kitchen effect already confirm karte hain.","No kitchen capacity failure given hai."] },
      "lesson": "Response ki failure aur business ke effects ko alag dekhna shuru karo."
    }
  ],
  "interview": {
    "title": "Interview Round — ek order ka safar",
    "instructions": "Pehle KhanaKart ka haal socho. Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Order saved, kitchen done, notify failed. Kya response 503 ka matlab order nahi bana?",
        "choices": ["Nahi; save aur kitchen ke effects reh sakte hain","Haan; HTTP 503 earlier storage changes undo karta hai","Haan; error response kitchen execution cancel karta hai"],
        "answer": 0,
        "explain": "HTTP failure response pehle se completed independent operations automatically rollback nahi karta. HTTP protocol distributed transaction rollback implement nahi karta. Already executed kitchen side effect response se undo nahi hota."
      , choiceExplanations: ["HTTP failure response pehle se completed independent operations automatically rollback nahi karta.","HTTP protocol distributed transaction rollback implement nahi karta.","Already executed kitchen side effect response se undo nahi hota."] },
      {
        "q": "Accepted ka sahi business matlab kya rakhein?",
        "choices": ["Recorded acceptance; downstream completion alag state","Kitchen aur notification dono complete hone ka proof","Inventory aur payment checks complete hone ka proof"],
        "answer": 0,
        "explain": "Accepted ka documented contract queued/recorded work ho sakta hai; actual completion trackable honi chahiye. Async acceptance completed cooking/SMS delivery ka evidence nahi. Unperformed checks ko acceptance status confirm nahi karta."
      , choiceExplanations: ["Accepted ka documented contract queued/recorded work ho sakta hai; actual completion trackable honi chahiye.","Async acceptance completed cooking/SMS delivery ka evidence nahi.","Unperformed checks ko acceptance status confirm nahi karta."] }
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
