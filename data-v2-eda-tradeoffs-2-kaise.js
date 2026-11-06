/* Playlist · EDA Core topic 3: EDA tradeoffs. Source credit: Software Developer Diaries,
   "Here's when Event-Driven Systems should REALLY be used" (Of-br0OG5ic).
   Numbers: docker-labs/48-eda-tradeoffs/captures. Docs: SQS SetQueueAttributes + DLQ, RabbitMQ TTL + DLX. */
(function () {
const HERO = [{"id": "in", "icon": "📨", "label": "messages", "x": 140, "y": 105}, {"id": "line", "icon": "⏳", "label": "retention", "x": 445, "y": 105}, {"id": "dead", "icon": "🗃️", "label": "dead-letter", "x": 750, "y": 105}];
const EDGES = [{"from": "in", "to": "line"}, {"from": "line", "to": "dead"}];
VISUALS["et-kaise"] = { t: "Consumer band, line rakhti hai — par sirf retention tak. Phir phenko ya dead-letter.", html: SD.viz.svg(HERO, EDGES, { nodes: { in: {tone:'ok',badge:'20/min'}, line: {tone:'slow',badge:'60 min tak'}, dead: {tone:'bad',badge:'ya phenka'} } }, {w:890,h:215}) };
SD.registerLevels('sdd-eda', [
{
  "id": "et-kaise",
  "icon": "⏳",
  "group": "⚖️ EDA Tradeoffs",
  "title": "Tradeoff 2 · Kaise — consumer band ho toh line kitni der sambhaalti hai?",
  "badge": "Line Hisaabi",
  "objectives": [
    "Line producer aur consumer ko waqt se kaise alag karti hai?",
    "Retention khatam hone par message ka kya hota hai?",
    "Line kab khaali hogi, workers badhane se kya badla?",
    "SQS aur RabbitMQ expire hue message ke saath kya karte hain?"
  ],
  "lesson": [
    "<h3>⏳ Cook chhutti par</h3><p>Dhabe ka message wala 90 minute ke liye gayab. Counter order leta raha aur parchiyan ek dibbe mein daalta raha. Par dibbe par likha hai: \"60 minute se purani parchi hata do.\"</p><p>Message wala laute tak kya bachega? Pehle dekho.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "✉️ Email-service ka deploy atka: line kitni der sambhaalegi?",
      "goal": "Har minute 20 order-email line mein aate hain. email-service 90 minute band, phir 50/min nikaalti hai. Line ki retention 60 minute, dead-letter chalu. tools/offline.js ka nakli-ghadi model.",
      "nodes": [
        {
          "id": "api",
          "icon": "📨",
          "label": "order-api",
          "x": 160,
          "y": 140
        },
        {
          "id": "line",
          "icon": "⏳",
          "label": "line (60 min)",
          "x": 445,
          "y": 140
        },
        {
          "id": "mail",
          "icon": "✉️",
          "label": "email-service",
          "x": 730,
          "y": 140
        },
        {
          "id": "dead",
          "icon": "🗃️",
          "label": "dead-letter",
          "x": 445,
          "y": 315
        }
      ],
      "edges": [
        {
          "from": "api",
          "to": "line"
        },
        {
          "from": "line",
          "to": "mail"
        },
        {
          "from": "line",
          "to": "dead"
        }
      ],
      "viz": {
        "w": 890,
        "h": 390,
        "focus": [
          "line",
          "dead"
        ]
      },
      "vars": [
        {
          "id": "aaye",
          "label": "Aaye"
        },
        {
          "id": "hue",
          "label": "Hue"
        },
        {
          "id": "line",
          "label": "Line mein"
        },
        {
          "id": "purana",
          "label": "Sabse purana"
        },
        {
          "id": "dead",
          "label": "Dead-letter"
        }
      ],
      "steps": [
        {
          "title": "Deploy atka",
          "clock": "1 min",
          "say": "email-service band hai. order-api ko farak nahi: har message line mein, order ka jawab turant. Pehle minute ke 20 line mein.",
          "nodes": {
            "api": {
              "tone": "ok",
              "badge": "20/min"
            },
            "line": {
              "tone": "slow",
              "badge": "20"
            },
            "mail": {
              "tone": "bad",
              "badge": "band"
            },
            "dead": {
              "tone": "idle",
              "badge": "0"
            }
          },
          "vars": {
            "aaye": "20",
            "hue": "0",
            "line": "20",
            "purana": "0 min",
            "dead": "0"
          },
          "flows": [
            {
              "from": "api",
              "to": "line",
              "label": "20/min",
              "tone": "acc"
            }
          ]
        },
        {
          "title": "Aadha ghanta",
          "clock": "30 min",
          "say": "Line mein 600, sabse purana 29 minute se ruka. Line ki wajah se producer aur consumer ko ek saath chalu nahi rehna padta. Producer aur consumer ki waqt se azaadi ko <b>temporal decoupling</b> kehte hain.",
          "nodes": {
            "api": {
              "tone": "ok",
              "badge": "20/min"
            },
            "line": {
              "tone": "slow",
              "badge": "600"
            },
            "mail": {
              "tone": "bad",
              "badge": "band"
            },
            "dead": {
              "tone": "idle",
              "badge": "0"
            }
          },
          "vars": {
            "aaye": "600",
            "hue": "0",
            "line": "600",
            "purana": "29 min",
            "dead": "0"
          }
        },
        {
          "title": "Ek ghanta",
          "clock": "60 min",
          "say": "Line mein 1,200, sabse purana 59 minute. Retention 60 minute hai.",
          "nodes": {
            "api": {
              "tone": "ok",
              "badge": "20/min"
            },
            "line": {
              "tone": "slow",
              "badge": "1200"
            },
            "mail": {
              "tone": "bad",
              "badge": "band"
            },
            "dead": {
              "tone": "idle",
              "badge": "0"
            }
          },
          "vars": {
            "aaye": "1200",
            "hue": "0",
            "line": "1200",
            "purana": "59 min",
            "dead": "0"
          },
          "ask": {
            "q": "email-service abhi bhi band hai. Lab ki ghadi par 62ve minute mein, jab pehle minute ke messages ki umar 60 min se zyada hogi, kya hoga?",
            "choices": [
              "60 minute se purane hote hi line se hat-te jaayenge — yahan dead-letter mein",
              "Line mein tab tak rahenge jab tak email-service wapas na aaye, chahe kitni der ho",
              "Line bhar gayi, toh order-api naye order lena band kar dega"
            ],
            "answer": 0,
            "hint": "Retention ka matlab kya hai?",
            "explain": "Retention batati hai message line mein kitni der reh sakta hai. 60 minute se purana hote hi message hat-ta hai — consumer band ho tab bhi. Is lab mein dead-letter chalu hai, toh alag line mein jaata hai; band hota toh phenk diya jaata. Lab mein bilkul 60 min purana message abhi rehta hai; shart umar > 60 min hai.",
            "choiceExplanations": [
              "Retention batati hai message line mein kitni der reh sakta hai. 60 minute se purana hote hi message hat-ta hai — consumer band ho tab bhi. Is lab mein dead-letter chalu hai, toh alag line mein jaata hai; band hota toh phenk diya jaata. Lab mein bilkul 60 min purana message abhi rehta hai; shart umar > 60 min hai.",
              "Line message ko retention tak hi rakhti hai. Consumer ke lautne ka intezaar nahi karti.",
              "Is lab ki line ki koi size hadd nahi; dikkat waqt ki hadd (retention) hai."
            ]
          }
        },
        {
          "title": "Deploy theek hone tak",
          "clock": "90 min",
          "say": "90ve minute tak 1,800 aaye. Line 1,220 par atki: har minute 20 aaye aur 20 purane retention ke bahar gaye. 580 dead-letter mein.",
          "nodes": {
            "api": {
              "tone": "ok",
              "badge": "20/min"
            },
            "line": {
              "tone": "slow",
              "badge": "1220"
            },
            "mail": {
              "tone": "bad",
              "badge": "band"
            },
            "dead": {
              "tone": "bad",
              "badge": "580"
            }
          },
          "vars": {
            "aaye": "1800",
            "hue": "0",
            "line": "1220",
            "purana": "60 min",
            "dead": "580"
          },
          "flows": [
            {
              "from": "line",
              "to": "dead",
              "label": "purane",
              "tone": "bad",
              "back": true
            }
          ]
        },
        {
          "title": "email-service wapas",
          "clock": "91 min",
          "say": "Ab 50/min nikal rahe, 20/min aa rahe. Line har minute 30 ghat rahi hai. Pehle 30 minute ke 600 messages dead-letter mein pahunch chuke.",
          "nodes": {
            "api": {
              "tone": "ok",
              "badge": "20/min"
            },
            "line": {
              "tone": "slow",
              "badge": "1170"
            },
            "mail": {
              "tone": "busy",
              "badge": "50/min"
            },
            "dead": {
              "tone": "bad",
              "badge": "600"
            }
          },
          "vars": {
            "aaye": "1820",
            "hue": "50",
            "line": "1170",
            "purana": "58 min",
            "dead": "600"
          },
          "flows": [
            {
              "from": "line",
              "to": "mail",
              "label": "50/min",
              "tone": "ok"
            }
          ],
          "ask": {
            "q": "1,170 ki line, 50 nikal rahe, 20 aa rahe. Line kab khaali hogi?",
            "choices": [
              "Lagbhag 39 minute baad — har minute 30 ghatti hai, 1,170 / 30",
              "Lagbhag 23 minute baad — 50/min nikalte hain, toh 1,170 / 50",
              "Kabhi nahi — dead-letter mein 600 pade hain, pehle dead-letter ke messages nikalne honge"
            ],
            "answer": 0,
            "hint": "Naye messages abhi bhi aa rahe hain.",
            "explain": "Line utni ghat-ti hai jitna nikalna aane se zyada: 50 − 20 = 30 per minute. 1,170 / 30 = 39 minute, yaani lagbhag 130ve minute par. Dead-letter alag line hai; email-service dead-letter ko apne aap nahi padhti.",
            "choiceExplanations": [
              "Line utni ghat-ti hai jitna nikalna aane se zyada: 50 − 20 = 30 per minute. 1,170 / 30 = 39 minute, yaani lagbhag 130ve minute par. Dead-letter alag line hai; email-service dead-letter ko apne aap nahi padhti.",
              "1,170 / 50 bhoolta hai ki har minute 20 naye aa rahe hain.",
              "Dead-letter alag line hai. email-service ki line dead-letter ke bina bhi khaali ho jaati hai."
            ]
          }
        },
        {
          "title": "Line khaali",
          "clock": "130 min",
          "say": "130ve minute par line khaali. 2,600 aaye, 2,000 hue, 600 dead-letter mein. Ab kisi insaan ko dekhna padega: 600 order-emails dobara bhejne hain ya nahi.",
          "nodes": {
            "api": {
              "tone": "ok",
              "badge": "20/min"
            },
            "line": {
              "tone": "ok",
              "badge": "0"
            },
            "mail": {
              "tone": "ok",
              "badge": "aaram"
            },
            "dead": {
              "tone": "bad",
              "badge": "600"
            }
          },
          "vars": {
            "aaye": "2600",
            "hue": "2000",
            "line": "0",
            "purana": "0 min",
            "dead": "600"
          }
        }
      ],
      "lesson": "Line producer aur consumer ko waqt se alag karti hai: email-service band, phir bhi order chale. Par line message ko sirf retention tak rakhti hai. Purane messages hat jaate hain — is lab mein dead-letter chalu ho toh alag line mein, warna phenk diye jaate hain."
    },
    {
      "type": "cards",
      "title": "🧮 Line ka hisaab aur broker ke asli niyam",
      "goal": "Teen sawaal: line kitni der ki hai, workers badhane se kya badla, aur asli broker expire hue message ka kya karta hai?",
      "lesson": "Line ka size aur sabse purane message ki umar dono dekho. Workers line jaldi khaali karte hain. Retention aur dead-letter ki setting broker ke hisaab se alag hai — default par bharosa mat karo.",
      "steps": [
        {
          "title": "1. Retention lambi karo toh?",
          "say": "Lab mein wahi 90 minute ka band, par retention 4 din: 4,000 mein se 4,000 hue, 0 kho gaye. Line 150ve minute par khaali, aur sabse purana message 90 minute ruka."
        },
        {
          "title": "2. Workers do karo",
          "say": "Sale wala burst: 1 worker par line 400 tak, khaali 50ve second par, sabse lamba intezaar 20 s. 2 workers par line 200 tak, khaali 17ve second par, intezaar 5 s.",
          "ask": {
            "q": "Workers dugne kiye toh sabse lamba intezaar 20 s se 5 s kyun hua, sirf aadha (10 s) kyun nahi?",
            "choices": [
              "Peak line aadhi hui aur kul capacity dugni — 400/20 se 200/40, yaani 20 s se 5 s",
              "Sirf peak line aadhi hui — kul capacity wahi rahi, isliye intezaar chauthai hua",
              "Naye order aana band hue — order aana band hone se intezaar chauthai hua"
            ],
            "answer": 0,
            "hint": "Message se aage kitna kaam hai, aur kul capacity kitni?",
            "explain": "FIFO mein message se aage ka kaam kul capacity se nikalta hai. Ek worker: peak line 400, capacity 20/s, lagbhag 20 s intezaar. Do workers: peak line 200, capacity 40/s, lagbhag 5 s. Line aadhi aur capacity dugni hone se intezaar chauthai hua. Nikalna minus aana poori line khaali hone ka waqt batata hai.",
            "choiceExplanations": [
              "FIFO mein message se aage ka kaam kul capacity se nikalta hai. Ek worker: peak line 400, capacity 20/s, lagbhag 20 s intezaar. Do workers: peak line 200, capacity 40/s, lagbhag 5 s. Line aadhi aur capacity dugni hone se intezaar chauthai hua. Nikalna minus aana poori line khaali hone ka waqt batata hai.",
              "Do workers ki kul capacity 40/s hai; capacity wahi nahi rahi.",
              "Burst ke baad bhi 10 order/s aate rahe."
            ]
          }
        },
        {
          "title": "3. Asli broker kya karta hai?",
          "say": "<b>SQS:</b> retention 1 minute se 14 din, default 4 din; retention khatam = message delete. SQS ka dead-letter queue <b>maxReceiveCount</b> se bharta hai (message baar-baar receive hua, par delete nahi hua), expiry se nahi. Standard queue mein DLQ mein jaane par bhi message ki umar purani hi rehti hai. <b>RabbitMQ:</b> TTL paar hone par message consumer ko nahi milta. DLX set ho toh dead-letter exchange par dobara publish hota hai; message bachane ke liye sahi destination queue, routing aur forwarding ki safety bhi chahiye.",
          "ask": {
            "q": "Video kehta hai: retention khatam hone par message dead-letter queue mein chala jaata hai, \"messages hamesha safe\". SQS par kya hoga?",
            "choices": [
              "Retention expiry message delete karegi; maxReceiveCount wali policy alag trigger hai",
              "Retention expiry message ko DLQ bhejegi; maxReceiveCount sirf retry ka delay tay karta hai",
              "Retention expiry message ko tab delete karegi jab agla consumer receive karega"
            ],
            "answer": 0,
            "hint": "SQS ka DLQ kis cheez se bharta hai?",
            "explain": "SQS mein retention khatam = message delete. Source queue par DLQ ki redrive policy lagi ho toh receive count maxReceiveCount paar karne par message DLQ mein jaata hai; SQS consumer ke business-result ko nahi ginta. Consumer lamba band ho sakta hai toh retention lambi rakho, aur backlog-age par alert lagao.",
            "choiceExplanations": [
              "SQS mein retention khatam = message delete. Source queue par DLQ ki redrive policy lagi ho toh receive count maxReceiveCount paar karne par message DLQ mein jaata hai; SQS consumer ke business-result ko nahi ginta. Consumer lamba band ho sakta hai toh retention lambi rakho, aur backlog-age par alert lagao.",
              "maxReceiveCount redrive ki receive-count hadd hai; retention expiry ko DLQ trigger nahi banata.",
              "Retention expiry ke liye agla consumer receive karna zaroori nahi."
            ]
          }
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Consumer band, retention aur dead-letter — apne terminal mein",
      "project": "48-eda-tradeoffs",
      "exercise": "ex2-offline",
      "goal": "Wahi 90 minute ka band teen settings ke saath, phir burst par 2 workers.",
      "why": "Node 18+ chahiye; koi service nahi chalti. Output lab 48 ke captures se hai; teeno runs byte-identical.",
      "steps": [
        {
          "text": "Lab folder se: teen retention settings.",
          "cmd": "cd docker-labs/48-eda-tradeoffs && npm start -- ex2-offline",
          "expect": "consumer 0–90 min band · 20 msg/min aate · wapas aakar 50 msg/min (nakli ghadi)\nretention 60 min, dead-letter nahi   aaye=4000 hue=3400 phenke=600 dead-letter=0 line khaali=130 min sabse lamba intezaar=60 min\nretention 60 min, dead-letter chalu  aaye=4000 hue=3400 phenke=0 dead-letter=600 line khaali=130 min sabse lamba intezaar=60 min\nretention 4 din                      aaye=4000 hue=4000 phenke=0 dead-letter=0 line khaali=150 min sabse lamba intezaar=90 min"
        },
        {
          "text": "Sale ka burst, 2 workers.",
          "cmd": "npm start -- ex1-level --profile burst --workers 2",
          "expect": "profile=burst workers=2 queue=true | capacity 40/s\n  5 s  aaye=300 hue=200 reject=0 line=100 sabse-purana=1 s\n 10 s  aaye=600 hue=400 reject=0 line=200 sabse-purana=3 s\n 15 s  aaye=650 hue=600 reject=0 line=50 sabse-purana=4 s\n 20 s  aaye=700 hue=700 reject=0 line=0 sabse-purana=0 s\n 25 s  aaye=750 hue=750 reject=0 line=0 sabse-purana=0 s\n 30 s  aaye=800 hue=800 reject=0 line=0 sabse-purana=0 s\n 35 s  aaye=850 hue=850 reject=0 line=0 sabse-purana=0 s\n 40 s  aaye=900 hue=900 reject=0 line=0 sabse-purana=0 s\n 45 s  aaye=950 hue=950 reject=0 line=0 sabse-purana=0 s\n 50 s  aaye=1000 hue=1000 reject=0 line=0 sabse-purana=0 s\n 55 s  aaye=1050 hue=1050 reject=0 line=0 sabse-purana=0 s\n 60 s  aaye=1100 hue=1100 reject=0 line=0 sabse-purana=0 s\npeak line=200 (10 s) · khaali hui=17 s · sabse lamba intezaar=5 s · reject=0"
        }
      ],
      "observe": {
        "q": "Pehli do settings mein hue=3,400. Ek mein phenke=600, doosri mein dead-letter=600. Farak kya hai?",
        "choices": [
          "Dono mein 600 kaam nahi hue; dead-letter mein 600 dikh rahe hain aur dobara chalaye ja sakte hain",
          "Dead-letter wali setting mein 600 email baad mein apne aap chale gaye, toh kuch nahi khoya",
          "Phenke wali setting mein email-service ne 600 galat email bheje, isliye 600 phenke gaye"
        ],
        "answer": 0,
        "hint": "hue dono mein kitne hain?",
        "explain": "Dono mein 3,400 hue aur 600 ka kaam nahi hua. Bina dead-letter ke 600 chupchaap gaye. Dead-letter mein 600 bache hain, par kisi ko 600 messages dekhne aur dobara chalane padenge — dead-letter apne aap kuch nahi bhejta.",
        "choiceExplanations": [
          "Dono mein 3,400 hue aur 600 ka kaam nahi hua. Bina dead-letter ke 600 chupchaap gaye. Dead-letter mein 600 bache hain, par kisi ko 600 messages dekhne aur dobara chalane padenge — dead-letter apne aap kuch nahi bhejta.",
          "Dead-letter mein pada message khud kuch nahi karta. hue=3,400 hi raha.",
          "Phenke gaye 600 email-service tak pahunche hi nahi; retention ne line se hataya."
        ]
      },
      "lesson": "Line consumer ke band rehne ka waqt retention tak hi sambhaalti hai. Dead-letter kaam ko bachaata hai, poora nahi karta. Workers badhane se line jaldi khaali hoti hai."
    }
  ],
  "interview": {
    "title": "Interview Round — line, retention, dead-letter",
    "instructions": "Pehle socho message kitni der aur kahan reh sakta hai. Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Weekend par consumer 3 din band raha. SQS queue ki retention 1 din thi. Monday ko 2 din ke orders gayab hain aur DLQ khaali hai. Kyun?",
        "choices": [
          "Retention 1 din: purane messages delete hue; SQS ka DLQ expiry se nahi bharta",
          "DLQ ka maxReceiveCount bahut zyada tha, isliye expire hue messages DLQ tak nahi pahunche",
          "Consumer band tha, isliye SQS ne naye messages lena hi band kar diya tha",
          "SQS ne gayab messages producer ko wapas bheje, aur producer ne wapas aaye messages phenk diye"
        ],
        "answer": 0,
        "explain": "SQS mein retention khatam = delete. DLQ aise messages ke liye hai jo maxReceiveCount se zyada baar receive hue (par delete nahi hue), aur yahan consumer ne kuch receive hi nahi kiya. Ilaaj: lambe band ke hisaab se retention (max 14 din), aur backlog-age par alert.",
        "choiceExplanations": [
          "SQS mein retention khatam = delete. DLQ aise messages ke liye hai jo maxReceiveCount se zyada baar receive hue (par delete nahi hue), aur yahan consumer ne kuch receive hi nahi kiya. Ilaaj: lambe band ke hisaab se retention (max 14 din), aur backlog-age par alert.",
          "maxReceiveCount tab lagta hai jab message receive ho. Band consumer ne receive hi nahi kiya.",
          "SQS consumer band hone par bhi naye messages leta rehta hai — wahi line mein jama hote hain.",
          "SQS expire hua message delete karta hai; producer ko wapas nahi bhejta."
        ]
      },
      {
        "q": "Video kehta hai: message queue ho toh \"in any case your messages are safe\". Aap kya jodoge?",
        "choices": [
          "Safe sirf retention tak, aur DLQ ki setting ke hisaab se; backlog-age monitor karo",
          "Kuch nahi — broker ek baar message le le toh message kabhi nahi khota",
          "Safe tabhi jab producer har message do baar bheje, warna ek copy kho jaati hai",
          "Messages safe hain, bas consumer ko roz restart karna padta hai taaki line chale"
        ],
        "answer": 0,
        "explain": "Line message ko retention tak rakhti hai. Expire hone par RabbitMQ consumer ko message nahi deta (DLX set ho toh dead-letter exchange par dobara publish, jo routing par tika hai), SQS delete karta hai. Broker ki durability (disk, replication) bhi alag sawaal hai. Isliye backlog aur sabse purane message ki umar par alert rakho.",
        "choiceExplanations": [
          "Line message ko retention tak rakhti hai. Expire hone par RabbitMQ consumer ko message nahi deta (DLX set ho toh dead-letter exchange par dobara publish, jo routing par tika hai), SQS delete karta hai. Broker ki durability (disk, replication) bhi alag sawaal hai. Isliye backlog aur sabse purane message ki umar par alert rakho.",
          "Lab mein 60 min retention par 600 messages gaye. Settings aur durability se tay hota hai.",
          "Do baar bhejne se duplicate bante hain; retention ka masla nahi sulajhta.",
          "Restart se purane messages wapas nahi aate. Dikkat retention aur consumer ke band rehne ki hai."
        ]
      }
    ]
  },
  "success": [
    "Consumer band hone par line ka faayda aur retention ki hadd samjha sakte ho",
    "Line khaali hone ka waqt aur workers ka asar gin sakte ho",
    "SQS aur RabbitMQ mein expire hue message ka anjaam bata sakte ho"
  ],
  "cards": [
    {
      "front": "Temporal decoupling ka faayda?",
      "back": "Producer aur consumer ek saath zinda na hon tab bhi kaam chale — line message ko rakhti hai."
    },
    {
      "front": "Kitni der tak?",
      "back": "Sirf retention tak. Lab: 60 min retention, 90 min band = 600 messages gaye."
    },
    {
      "front": "SQS DLQ kab bharta hai?",
      "back": "maxReceiveCount paar hone par. Expire hua message SQS delete karta hai, DLQ mein nahi bhejta."
    }
  ]
}
]);
})();
