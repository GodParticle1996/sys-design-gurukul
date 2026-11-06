/* Playlist · EDA Core topic 2: event payloads. Source credit: Software Developer Diaries,
   A Beginner's Guide to Event-Driven Architecture (RojKJnF_WWQ); Martin Fowler, "What do you mean by Event-Driven?".
   Numbers: docker-labs/47-event-payloads/captures; source code byte-checked. */
(function () {
const HERO = [{"id": "owner", "icon": "🧾", "label": "order-service", "x": 140, "y": 105}, {"id": "line", "icon": "📬", "label": "khabar", "x": 445, "y": 105}, {"id": "work", "icon": "🛵", "label": "consumers", "x": 750, "y": 105}];
const EDGES = [{"from": "owner", "to": "line"}, {"from": "line", "to": "work"}, {"from": "work", "to": "owner"}];
VISUALS["ep-kyun"] = { t: "Khabar aayi, par kaam ka data kahan hai? Har consumer wapas order-service ke darwaze par.", html: SD.viz.svg(HERO, EDGES, { nodes: { owner: {tone:'bad',badge:'har khabar par N calls'}, line: {tone:'slow',badge:'sirf "42 badla"'}, work: {tone:'busy',badge:'data ka intezaar'} } }, {w:890,h:215}) };
SD.registerLevels('sdd-eda', [
{
  "id": "ep-kyun",
  "icon": "🔔",
  "group": "📦 Event Payloads",
  "title": "Payload 1 · Kyun — khabar aayi, par data ke liye phir owner ke darwaze par?",
  "badge": "Ghanti Shishya",
  "objectives": [
    "Patli khabar par owner par kitni reads padti hain?",
    "Owner band ho toh khabar aane ke baad bhi kaam kyun rukta hai?",
    "Patli khabar par consumer ko \"tab\" ka data milta hai ya \"abhi\" ka?"
  ],
  "lesson": [
    "<h3>🔔 Ghanti baji, par parchi kahan hai?</h3><p>Asha ke dhabe par munshi order badalte hi ghanti bajata hai: \"Order 42 badla!\" Rasoi, delivery aur message wala — teeno register padhne munshi ke paas daudte hain.</p><p>Munshi chhutti par ho toh? Pehle ghanti wala tareeka chala ke dekho.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "🔔 Patli khabar: \"42 badla\" — data kahan se aayega?",
      "goal": "Sawaal: khabar mein sirf order number ho, toh consumers ko pata, phone aur thali kaise milegi? Neeche lab 47 ke tools/slowmo.js --mode thin ka fixed-clock trace hai; saare ms lab ke tay kiye hue hain.",
      "nodes": [
        {
          "id": "owner",
          "icon": "🧾",
          "label": "order-service",
          "x": 150,
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
          "id": "delivery",
          "icon": "🛵",
          "label": "delivery",
          "x": 150,
          "y": 250
        },
        {
          "id": "notify",
          "icon": "📨",
          "label": "notify",
          "x": 445,
          "y": 250
        },
        {
          "id": "kitchen",
          "icon": "🍳",
          "label": "kitchen",
          "x": 740,
          "y": 250
        }
      ],
      "edges": [
        {
          "from": "owner",
          "to": "bus"
        },
        {
          "from": "bus",
          "to": "delivery"
        },
        {
          "from": "bus",
          "to": "notify"
        },
        {
          "from": "bus",
          "to": "kitchen"
        },
        {
          "from": "delivery",
          "to": "owner"
        }
      ],
      "viz": {
        "w": 890,
        "h": 350,
        "focus": [
          "owner",
          "delivery"
        ]
      },
      "vars": [
        {
          "id": "ver",
          "label": "Owner ke paas order #42"
        },
        {
          "id": "reads",
          "label": "Owner par reads"
        },
        {
          "id": "pending",
          "label": "Line mein (delivery / notify / kitchen)"
        },
        {
          "id": "saw",
          "label": "Delivery ne kya dekha"
        }
      ],
      "steps": [
        {
          "title": "Order #42 save hua (v1)",
          "clock": "0 ms",
          "say": "Asha ka order save hua: pata 12 Neem Road, thali dal-roti. order-service is order ka <b>owner</b> hai — asli data sirf order-service ke paas. <b>Version</b> order ke badlaav ka number hai: pehli saved haalat v1, agle badlaav ke baad v2.",
          "nodes": {
            "owner": {
              "tone": "ok",
              "badge": "v1 save"
            },
            "bus": {
              "tone": "idle",
              "badge": "abhi kuch nahi"
            },
            "delivery": {
              "tone": "idle",
              "badge": "abhi kuch nahi"
            },
            "notify": {
              "tone": "idle",
              "badge": "abhi kuch nahi"
            },
            "kitchen": {
              "tone": "idle",
              "badge": "abhi kuch nahi"
            }
          },
          "vars": {
            "ver": "v1 · 12 Neem Road",
            "reads": "0",
            "pending": "0 / 0 / 0",
            "saw": "—"
          }
        },
        {
          "title": "Patli khabar gayi",
          "clock": "10 ms",
          "say": "order-service ne khabar bheji: <code>{type, id: 42, version: 1}</code>. Teeno consumers ki line mein ek-ek copy. Khabar mein pata, phone ya thali kuch nahi.",
          "nodes": {
            "owner": {
              "tone": "ok",
              "badge": "v1"
            },
            "bus": {
              "tone": "busy",
              "badge": "3 copies"
            },
            "delivery": {
              "tone": "slow",
              "badge": "1 baaki"
            },
            "notify": {
              "tone": "slow",
              "badge": "1 baaki"
            },
            "kitchen": {
              "tone": "slow",
              "badge": "1 baaki"
            }
          },
          "vars": {
            "ver": "v1 · 12 Neem Road",
            "reads": "0",
            "pending": "1 / 1 / 1",
            "saw": "—"
          },
          "flows": [
            {
              "from": "owner",
              "to": "bus",
              "label": "42 badla (v1)",
              "tone": "acc"
            }
          ]
        },
        {
          "title": "Consumers se pehle hi Asha ne order badla (v2)",
          "clock": "20 ms",
          "say": "Consumers ne abhi kuch nahi uthaya. Itne mein Asha ne pata badla: 99 Mango Lane, aur thali idli. Owner ab v2 par hai.",
          "nodes": {
            "owner": {
              "tone": "ok",
              "badge": "v2 save"
            },
            "bus": {
              "tone": "busy",
              "badge": "3 copies"
            },
            "delivery": {
              "tone": "slow",
              "badge": "1 baaki"
            },
            "notify": {
              "tone": "slow",
              "badge": "1 baaki"
            },
            "kitchen": {
              "tone": "slow",
              "badge": "1 baaki"
            }
          },
          "vars": {
            "ver": "v2 · 99 Mango Lane",
            "reads": "0",
            "pending": "1 / 1 / 1",
            "saw": "—"
          }
        },
        {
          "title": "v2 ki khabar bhi line mein",
          "clock": "30 ms",
          "say": "Doosri patli khabar gayi: <code>{id: 42, version: 2}</code>. Har line mein ab do khabrein hain, aur owner par abhi ek bhi read nahi.",
          "nodes": {
            "owner": {
              "tone": "ok",
              "badge": "v2"
            },
            "bus": {
              "tone": "busy",
              "badge": "6 copies"
            },
            "delivery": {
              "tone": "slow",
              "badge": "2 baaki"
            },
            "notify": {
              "tone": "slow",
              "badge": "2 baaki"
            },
            "kitchen": {
              "tone": "slow",
              "badge": "2 baaki"
            }
          },
          "vars": {
            "ver": "v2 · 99 Mango Lane",
            "reads": "0",
            "pending": "2 / 2 / 2",
            "saw": "—"
          },
          "flows": [
            {
              "from": "owner",
              "to": "bus",
              "label": "42 badla (v2)",
              "tone": "acc"
            }
          ],
          "ask": {
            "q": "Delivery ab v1 wali khabar uthayegi aur pata order-service se maangegi. Delivery ko kaunsa pata milega?",
            "choices": [
              "99 Mango Lane — owner abhi v2 par hai, aur call owner ka abhi ka order lautati hai",
              "12 Neem Road — khabar v1 ki hai, toh owner bhi v1 wala purana pata lautayega",
              "Koi pata nahi — v1 ab purani ho chuki, toh owner is call ko seedha mana kar dega"
            ],
            "answer": 0,
            "hint": "Owner ke paas abhi kaunsa version hai? Call kab ho rahi hai?",
            "explain": "Patli khabar sirf batati hai ki kuch badla. Data call ke waqt owner se aata hai, aur owner abhi v2 par hai. Isliye v1 ki khabar par bhi naya pata milta hai: 12 Neem Road delivery ko kabhi nahi dikhta.",
            "choiceExplanations": [
              "Patli khabar sirf batati hai ki kuch badla. Data call ke waqt owner se aata hai, aur owner abhi v2 par hai. Isliye v1 ki khabar par bhi naya pata milta hai: 12 Neem Road delivery ko kabhi nahi dikhta.",
              "Is lab ke owner ke paas purane versions padhne ka raasta nahi. Call hamesha abhi ka order deti hai.",
              "Owner purani khabar par call mana nahi karta. Call chal jaati hai — bas data abhi ka hota hai."
            ]
          }
        },
        {
          "title": "Delivery ne v1 khabar par owner ko call kiya",
          "clock": "100 ms",
          "say": "Delivery ne khabar uthayi, owner se order maanga, aur kaam ke baad ack kiya. Khabar v1 ki thi, data v2 ka mila. Owner par pehli read.",
          "nodes": {
            "owner": {
              "tone": "busy",
              "badge": "read 1"
            },
            "bus": {
              "tone": "busy",
              "badge": "5 copies"
            },
            "delivery": {
              "tone": "ok",
              "badge": "v1 khabar, v2 data"
            },
            "notify": {
              "tone": "slow",
              "badge": "2 baaki"
            },
            "kitchen": {
              "tone": "slow",
              "badge": "2 baaki"
            }
          },
          "vars": {
            "ver": "v2 · 99 Mango Lane",
            "reads": "1",
            "pending": "1 / 2 / 2",
            "saw": "khabar v1 → pata 99 Mango Lane"
          },
          "flows": [
            {
              "from": "delivery",
              "to": "owner",
              "label": "GET",
              "tone": "slow",
              "back": true
            }
          ]
        },
        {
          "title": "Notify aur kitchen ne bhi call kiya",
          "clock": "120 ms",
          "say": "Notify ko phone chahiye tha, kitchen ko thali. Dono ne bhi apni v1 khabar par owner ko call kiya. Ek khabar, teen consumers: owner par teen reads.",
          "nodes": {
            "owner": {
              "tone": "busy",
              "badge": "reads 3"
            },
            "bus": {
              "tone": "busy",
              "badge": "3 copies"
            },
            "delivery": {
              "tone": "ok",
              "badge": "1 baaki"
            },
            "notify": {
              "tone": "ok",
              "badge": "1 baaki"
            },
            "kitchen": {
              "tone": "ok",
              "badge": "1 baaki"
            }
          },
          "vars": {
            "ver": "v2 · 99 Mango Lane",
            "reads": "3",
            "pending": "1 / 1 / 1",
            "saw": "khabar v1 → pata 99 Mango Lane"
          },
          "ask": {
            "q": "120 ms par order-service band ho jaaye, toh pending v2 ki teen khabron ka kya hoga?",
            "choices": [
              "Khabrein line mein hain, par data ki call fail hogi — kaam atka rahega",
              "Consumers khabar se hi kaam kar lenge, kyunki owner ki ab zaroorat nahi",
              "Broker khud order-service ki jagah consumers ko order ka data de dega"
            ],
            "answer": 0,
            "hint": "Khabar mein kya hai, aur kaam ke liye kya chahiye?",
            "explain": "Khabar pahunch jaati hai, par kaam ka data owner ke paas hai. Owner band toh consumers retry karte reh jaayenge. Lab mein owner band karne par patli khabar ke 12 mein se 0 kaam poore hue.",
            "choiceExplanations": [
              "Khabar pahunch jaati hai, par kaam ka data owner ke paas hai. Owner band toh consumers retry karte reh jaayenge. Lab mein owner band karne par patli khabar ke 12 mein se 0 kaam poore hue.",
              "Patli khabar mein sirf id aur version hai. Pata, phone aur thali ke bina kaam nahi ho sakta.",
              "Broker sirf khabar rakhta aur baant-ta hai. Order ka data broker ke paas nahi hai."
            ]
          }
        },
        {
          "title": "v2 ki khabrein bhi khatam",
          "clock": "220 ms",
          "say": "Teeno ne v2 khabar uthayi aur phir owner ko call kiya. Do khabrein × teen consumers = owner par 6 reads. Saari lines khaali.",
          "nodes": {
            "owner": {
              "tone": "busy",
              "badge": "reads 6"
            },
            "bus": {
              "tone": "ok",
              "badge": "0 copies"
            },
            "delivery": {
              "tone": "ok",
              "badge": "poora"
            },
            "notify": {
              "tone": "ok",
              "badge": "poora"
            },
            "kitchen": {
              "tone": "ok",
              "badge": "poora"
            }
          },
          "vars": {
            "ver": "v2 · 99 Mango Lane",
            "reads": "6",
            "pending": "0 / 0 / 0",
            "saw": "khabar v2 → pata 99 Mango Lane"
          }
        }
      ],
      "lesson": "Patli khabar mein sirf \"kya badla\" hota hai. Har consumer data ke liye owner ko call karta hai: reads = khabrein × consumers. Owner band ho toh khabar aane ke baad bhi kaam ruk jaata hai, aur consumer ko sirf owner ka <b>abhi</b> ka data milta hai, khabar ke waqt ka nahi."
    },
    {
      "type": "cards",
      "title": "🍽️ Dhabe ki ghanti — pehle sawaal, phir naam",
      "lesson": "Patli khabar sirf batati hai kya badla; data ke liye har consumer owner ko call karta hai. Moti khabar kaam ka data saath le jaati hai, aur consumer apni copy rakhta hai.",
      "goal": "Counter sirf ghanti bajaye, ya parchi ki copy bhi de? Dono raaste socho, phir naam seekho.",
      "steps": [
        {
          "title": "1. Ghanti baji: \"Order 42 badla!\"",
          "say": "Asha ke dhabe par munshi ke paas register hai. Order badalte hi munshi ghanti bajata hai: \"Order 42 badla!\" Rasoi ko thali chahiye, delivery wale ko pata, message wale ko phone number. Teeno register padhne munshi ke paas daudte hain.",
          "ask": {
            "q": "Ek ghante mein 100 order badle, aur teen helper hain. Munshi ko kitni baar register dikhana padega?",
            "choices": [
              "Lagbhag 300 baar — har ghanti par teeno helper alag-alag aate hain",
              "Sirf 100 baar — ek helper padh ke baaki dono ko zubaani bata deta hai",
              "Ek bhi baar nahi — ghanti sunte hi helpers ko order ki saari baat pata hai"
            ],
            "answer": 0,
            "hint": "Ghanti mein sirf order number hai. Thali, pata aur phone kahan likhe hain?",
            "explain": "Ghanti mein sirf \"42 badla\" hai, kaam ka data nahi. Har helper ko apna data register se lena padta hai: 100 ghanti × 3 helper = 300 chakkar.",
            "choiceExplanations": [
              "Ghanti mein sirf \"42 badla\" hai, kaam ka data nahi. Har helper ko apna data register se lena padta hai: 100 ghanti × 3 helper = 300 chakkar.",
              "Helpers alag kaam karte hain aur ek doosre ka intezaar nahi karte. Har ek khud register tak jaata hai.",
              "Ghanti mein sirf order number hai. Thali, pata aur phone ke liye register dekhna hi padega."
            ]
          }
        },
        {
          "title": "2. Munshi chhutti par gaya",
          "say": "Ab munshi das minute ke liye bahar gaya. Ghantiyan pehle hi baj chuki thi. Helpers ke paas order number hai, par register band hai. Rasoi ko pata nahi kaunsi thali banaye.",
          "ask": {
            "q": "Munshi ke bina helpers ka kaam kaise chal sakta tha?",
            "choices": [
              "Ghanti ke saath har helper ko apne kaam ki parchi ki copy de do",
              "Helpers ko munshi ke lautne tak har minute register par bhejte raho",
              "Ghanti hi band kar do, taaki helpers bekaar ka chakkar na lagayein"
            ],
            "answer": 0,
            "hint": "Helper kis cheez ke liye munshi par tike hain?",
            "explain": "Helper sirf data ke liye munshi par tike the. Khabar ke saath kaam ka data bhi aa jaaye toh helper apni copy se kaam kar lete hain, munshi ho ya na ho.",
            "choiceExplanations": [
              "Helper sirf data ke liye munshi par tike the. Khabar ke saath kaam ka data bhi aa jaaye toh helper apni copy se kaam kar lete hain, munshi ho ya na ho.",
              "Baar-baar bhejne se register nahi khulta. Munshi lautega tab ek saath sab ki bheed bhi lagegi.",
              "Ghanti band karne se helpers ko badlaav ka pata hi nahi chalega. Dikkat ghanti nahi, khaali ghanti thi."
            ]
          }
        },
        {
          "title": "3. Parchi ki copy — par kitni?",
          "say": "Copy dene se chakkar khatam, par naye sawaal aate hain. Copy kitni badi ho? Rasoi ko Asha ka phone number dena zaroori hai? Purani parchi baad mein pahunchi toh? Agle level mein event size, extra fields aur purane event ke overwrite ka hisaab lab mein dekhenge."
        },
        {
          "title": "4. In dono tareekon ke naam",
          "say": "Sirf \"kya badla\" batane wali khabar: <b>event notification</b> (patla event). Consumer data ke liye owner ko <b>wapas call</b> karta hai. Kaam ka data saath le jaane wali khabar: <b>event-carried state transfer</b> (mota event). Consumer apni <b>local copy</b> rakhta hai. Data ka asli malik (yahan order-service) hi <b>owner</b> hai."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Owner band karke dekho — asli HTTP par",
      "project": "47-event-payloads",
      "exercise": "ex2-owner-down",
      "goal": "Paanch alag Node processes: broker, order-service aur teen consumers. Pehle 12 khabrein line mein, phir order-service ka process band, phir do retry rounds.",
      "why": "Node 18+ chahiye. Har tool apne processes khud chalata aur band karta hai (ports 5600–5604). Neeche ka output lab 47 ke captured HTTP runs se hai (--brief: har mode ki ek line); teeno runs byte-identical. Docker compose chalaya nahi gaya.",
      "steps": [
        {
          "text": "Lab folder se: patli aur moti khabar, beech mein order-service band.",
          "cmd": "cd docker-labs/47-event-payloads && npm start -- ex2-owner-down --brief",
          "expect": "HTTP between child processes\nmode=thin queuedBeforeStop=12 ownerProcessExited=true ownerUnavailableVerified=true retryRounds=2 completed=0 failedAttempts=6 stuck=12\nmode=fat queuedBeforeStop=12 ownerProcessExited=true ownerUnavailableVerified=true retryRounds=2 completed=12 failedAttempts=0 stuck=0"
        },
        {
          "text": "Owner chalu ho tab: 4 orders × 3 consumers par owner ki reads.",
          "cmd": "npm start -- ex1-load --brief",
          "expect": "HTTP between child processes\nmode=thin orders=4 consumers=3 reads=12 completed=12\nmode=fat orders=4 consumers=3 reads=0 completed=12"
        }
      ],
      "observe": {
        "q": "Owner band hone ke baad patli khabar: completed 0, stuck 12. Moti khabar: completed 12. Farak kahan se aaya?",
        "choices": [
          "Patli khabar ke consumers ko data ke liye band owner ko call karni thi; moti khabar mein data saath tha",
          "Moti khabar ko broker ne pehle bheja, isliye owner band hone se pehle hi saare kaam poore ho gaye",
          "Patli khabar ke consumers ne retry kiya hi nahi, isliye kaam atka; retry hota toh kaam ho jaata"
        ],
        "answer": 0,
        "hint": "failedAttempts aur reads dekho: kis mode ne owner ko call kiya?",
        "explain": "Dono modes mein 12 khabrein line mein thi aur owner band tha. Patli khabar par har consumer ki owner call fail hui (6 failed attempts), toh sab atke. Moti khabar ke consumers ne apni copy se kaam kiya: 0 calls, 12 poore.",
        "choiceExplanations": [
          "Dono modes mein 12 khabrein line mein thi aur owner band tha. Patli khabar par har consumer ki owner call fail hui (6 failed attempts), toh sab atke. Moti khabar ke consumers ne apni copy se kaam kiya: 0 calls, 12 poore.",
          "Dono modes mein 12 khabrein owner band hone se pehle line mein thi. Kaam owner band hone ke baad hi chala.",
          "Retry hua: do rounds, 6 failed attempts. Band owner ko kitni bhi baar call karo, data nahi milta."
        ]
      },
      "lesson": "Patli khabar consumer ko owner se baandh deti hai: owner band, toh kaam band. Moti khabar ke saath consumer apni copy se chalta hai. Consumer ki local copy thodi purani ho sakti hai. Agle level mein copy ka version aur event ka kram dekhenge."
    }
  ],
  "interview": {
    "title": "Interview Round — khabar mein kitna data?",
    "instructions": "Pehle KhanaKart ka haal socho. Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "order-service das minute band raha. Broker mein events aate rahe, par delivery-service ne ek bhi order process nahi kiya. Events mein sirf orderId tha. Wajah?",
        "choices": [
          "Har event par delivery ko pata order-service se lena tha, aur order-service band thi",
          "Broker ne order-service band dekh ke saare events delivery-service se chhupa liye",
          "Event mein sirf orderId tha, isliye broker ne events ko kharab maan ke phenk diya",
          "delivery-service ka apna database bhi order-service ke saath hi band ho gaya tha"
        ],
        "answer": 0,
        "explain": "Patle event par consumer ka kaam owner ki call par tika hai. Owner band, toh khabar hone ke baad bhi kaam ruka. Ilaaj ke raaste: event mein kaam ka data bhejo, ya owner ke band hone par retry aur pending ki saaf haalat rakho.",
        "choiceExplanations": [
          "Patle event par consumer ka kaam owner ki call par tika hai. Owner band, toh khabar hone ke baad bhi kaam ruka. Ilaaj ke raaste: event mein kaam ka data bhejo, ya owner ke band hone par retry aur pending ki saaf haalat rakho.",
          "Broker events ko owner ki haalat dekh ke nahi rokta. Events pahunche, par data lane wali call fail hui.",
          "Sirf orderId wala event bilkul theek event hai — patle event mein kaam ka data nahi hota.",
          "delivery-service ka apna database alag hai. delivery-service ko pata chahiye tha, aur pata sirf order-service ke paas tha."
        ]
      },
      {
        "q": "Sale ke din order-service par read traffic achanak kai guna ho gaya, jabki naye orders utne nahi badhe. Har order event par paanch services apna data maangti hain. Kya ho raha hai?",
        "choices": [
          "Har event par paanch read calls — read traffic events × consumers ke hisaab se badhta hai",
          "Order-service ka cache sale ke din apne aap band ho jaata hai, isliye reads badhte hain",
          "Broker har event ko paanch baar order-service ko bhejta hai, consumers ko nahi",
          "Read traffic sirf naye users se badha — events aur consumers ka is mein koi haath nahi"
        ],
        "answer": 0,
        "explain": "Patle event par har consumer owner se data maangta hai. Naya consumer judte hi owner ka read load badhta hai, bhale orders utne hi rahein. Mote event mein data saath jaata hai, toh owner ko wapas calls nahi hoti — par event bada hota hai aur data zyada jagah failta hai.",
        "choiceExplanations": [
          "Patle event par har consumer owner se data maangta hai. Naya consumer judte hi owner ka read load badhta hai, bhale orders utne hi rahein. Mote event mein data saath jaata hai, toh owner ko wapas calls nahi hoti — par event bada hota hai aur data zyada jagah failta hai.",
          "Cache khud band nahi hota. Reads ki ginti consumers ki wapas calls se aa rahi hai.",
          "Broker events consumers ko deta hai. Order-service tak aane wali calls consumers ki data maangne wali calls hain.",
          "Orders utne hi the. Har event par paanch consumers ka owner se data maangna hi gina gaya."
        ]
      }
    ]
  },
  "success": [
    "Patli khabar par owner ki reads ka hisaab laga sakte ho (khabrein × consumers)",
    "Owner band hone par patli khabar ka kaam kyun atakta hai, bata sakte ho",
    "Event notification aur event-carried state transfer mein farak bata sakte ho"
  ],
  "cards": [
    {
      "front": "Patla event (event notification)?",
      "back": "Sirf batata hai kya badla, jaise \"order 42 badla\". Data ke liye consumer owner ko wapas call karta hai."
    },
    {
      "front": "Mota event (event-carried state transfer)?",
      "back": "Kaam ka data khabar ke saath jaata hai. Consumer apni local copy se kaam karta hai, owner ko call kiye bina."
    },
    {
      "front": "Patle event ka chhupa kharcha?",
      "back": "Har event × har consumer = owner par ek read. Owner band ho toh khabar aane ke baad bhi kaam ruka."
    }
  ]
}
]);
})();
