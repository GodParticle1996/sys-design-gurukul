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
      "goal": "Sawaal: notification band ho toh kya order bhi fail dikhna chahiye? Ye trace tools/slowmo.js ka fixed-clock run hai. 100 ms kitchen aur 1000 ms failed notify lab ke tay delays hain.",
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
              "Is flow mein app notify ka jawab aane tak rukta hai",
              "Kitchen ne le liya, toh app ka jawab bhi chala gaya",
              "Order save hote hi jawab laut gaya, baaki kaam baad mein",
            ],
            "answer": 0,
            "hint": "Code ka kram dekho: save → kitchen → notify → response.",
            "explain": "Is flow mein app notify ka jawab aane tak Asha ko jawab nahi bhejta. Kitchen ka kaam ho chuka, par code abhi notify ke await par ruka hai.",
            "choiceExplanations": [
              "Is flow mein app notify ka jawab aane tak Asha ko jawab nahi bhejta. Kitchen ka kaam ho chuka, par code abhi notify ke await par ruka hai.",
              "Kitchen ka kaam ho gaya, par code abhi notify ke await par ruka hai. Jawab notify ke baad jaata hai.",
              "Save karne se baaki awaits nahi hat-te. Code ka kram: save → kitchen → notify → jawab.",
            ],
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
              "Pehle #1 ka status dekho; order aur kitchen ka kaam ho chuka hai",
              "503 ka matlab order bana hi nahi, toh naya order bhej do",
              "Wahi order nayi key se bhejo, pichhla kaam wapas ho chuka hai",
            ],
            "answer": 0,
            "hint": "Saved aur kitchen ki ginti dekho.",
            "explain": "Fail hue jawab se pehle pakke kaam ho chuke ho sakte hain (save, kitchen). Order ki pehchaan wahi rakho, aur status ya idempotency se pata karo kya hua. HTTP error rollback ki guarantee nahi.",
            "choiceExplanations": [
              "Fail hue jawab se pehle pakke kaam ho chuke ho sakte hain (save, kitchen). Order ki pehchaan wahi rakho, aur status ya idempotency se pata karo kya hua. HTTP error rollback ki guarantee nahi.",
              "Save aur kitchen dono ho chuke the. 503 ka matlab \"kuch nahi hua\" nahi.",
              "Nayi key se server pehchaan hi nahi paayega ki order pehle aa chuka — doosra order ban sakta hai.",
            ],
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
              "Order ka jawab notification ke poora hone se alag kar do",
              "Notification fail ho toh save hua order bhi radd maan lo",
              "Notification chhod do, aur jawab mein \"bhej diya\" bata do",
            ],
            "answer": 0,
            "hint": "Parchi lene aur message bhejne ki zimmedari alag socho.",
            "explain": "Order lena aur message bhejna alag vaade hain. Jawab order lene par do; message ka kaam alag chale, aur message ka apna status ho. (Pakki delivery ka design alag chahiye.)",
            "choiceExplanations": [
              "Order lena aur message bhejna alag vaade hain. Jawab order lene par do; message ka kaam alag chale, aur message ka apna status ho. (Pakki delivery ka design alag chahiye.)",
              "Bana hua aur kitchen tak gaya order radd bolna ulajhan badhata hai.",
              "Pending kaam ko \"bhej diya\" kehna jhooth hai — contract galat.",
            ],
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
      "lesson": "🎯 <b>Asli baat:</b> Pehle business ka promise tay karo: order accepted hua, ya kitchen aur message ka kaam bhi poora hua? Naam badalne se ye farak nahi mitta."
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
          "Save aur kitchen ke baad notify fail hua, aur notify ki failure order ke jawab tak aayi",
          "Save poora tha, par kitchen ka jawab atka raha — order ka jawab kitchen par ruka",
          "Save aur kitchen poore the; notify bulane se pehle hi app ka kul timeout beet gaya",
        ],
        "answer": 0,
        "explain": "Saved aur kitchen ho chuke, par await kiya hua notify fail hua aur jawab 503 ban gaya. Notify ki dikkat order ke jawab se bandhi thi.",
        "choiceExplanations": [
          "Saved aur kitchen ho chuke, par await kiya hua notify fail hua aur jawab 503 ban gaya. Notify ki dikkat order ke jawab se bandhi thi.",
          "Trace mein kitchen ka kaam 0.10 s par poora hai. API kitchen ke baad notify ka intezaar karti hai.",
          "Is seedhe run mein aisa koi kul timeout nahi. 1.10 s par notify ki failure aati hai, aur tabhi 503.",
        ],
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
          "Fail hone se pehle ke kaam (save, kitchen) reh sakte hain",
          "HTTP 503 pehle hue DB badlaav bhi wapas kar deta hai",
          "Error ka jawab jaate hi kitchen ka kaam bhi radd ho jaata",
        ],
        "answer": 0,
        "explain": "HTTP failure ka jawab pehle ho chuke alag kaamon ko apne aap wapas nahi karta. Kitchen ka kaam aur DB save reh jaate hain.",
        "choiceExplanations": [
          "HTTP failure ka jawab pehle ho chuke alag kaamon ko apne aap wapas nahi karta. Kitchen ka kaam aur DB save reh jaate hain.",
          "HTTP koi distributed rollback nahi karta. DB mein save reh jaata hai.",
          "Kitchen ka kaam ho chuka; error ka jawab kitchen ka kaam wapas nahi karta.",
        ],
      },
      {
        "q": "Accepted ka sahi business matlab kya rakhein?",
        "choices": [
          "Order mil gaya aur rakh liya, aage ke kaam ke liye — poora hona alag",
          "Khana ban gaya aur SMS bhi chala gaya — dono kaam poore ho gaye",
          "Payment aur stock dono confirm — chahe jaanch hui ho ya nahi",
        ],
        "answer": 0,
        "explain": "Accepted ka likha hua matlab: kaam rakh liya, aage chalega. Asli poora hona (khana, SMS) alag state hai, jo track honi chahiye.",
        "choiceExplanations": [
          "Accepted ka likha hua matlab: kaam rakh liya, aage chalega. Asli poora hona (khana, SMS) alag state hai, jo track honi chahiye.",
          "Accepted ka matlab kaam liya, poora nahi. Khana aur SMS baad ki states hain.",
          "Accepted bina hui jaanch ko confirm nahi karta.",
        ],
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
