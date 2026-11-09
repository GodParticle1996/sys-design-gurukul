/* Playlist · EDA Core topic 6: Event modeling. Source credit: Software Developer Diaries,
   "4 Event-Modeling Mistakes in Event-Driven Architectures" (m3mY3Ra-BcI); anti-patterns from Oskar Dudycz.
   Numbers: docker-labs/51-event-modeling/captures. */
(function () {
const HERO = [{"id": "prof", "icon": "🧑", "label": "profile service", "x": 150, "y": 55}, {"id": "ord", "icon": "📦", "label": "order service", "x": 150, "y": 295}, {"id": "bus", "icon": "📬", "label": "bus", "x": 500, "y": 190}, {"id": "lab", "icon": "🏷️", "label": "label service", "x": 810, "y": 190}];
const EDGES = [{"from": "prof", "to": "bus"}, {"from": "ord", "to": "bus"}, {"from": "bus", "to": "lab"}];
VISUALS["em-kyun"] = { t: "Ghar badla, par events teen gaye. Beech mein aaya order aadha naya, aadha purana address le gaya.", html: SD.viz.svg(HERO, EDGES, { nodes: { prof: {tone:'ok',badge:'3 events'}, ord: {tone:'ok',badge:'o1'}, bus: {tone:'busy',badge:'beech mein'}, lab: {tone:'bad',badge:'Lake View, Pune'} } }, {w:890,h:330}) };
SD.registerLevels('sdd-eda', [
{
  "id": "em-kyun",
  "icon": "🧩",
  "group": "🧩 Event Modeling",
  "title": "Modeling 1 · Kyun — sab events sach the, phir label galat kyun?",
  "badge": "Ghatna Shishya",
  "objectives": [
    "Field-field ke events beech mein aadha sach kaise dikhate hain?",
    "\"Balance badla\" jaise event se kya kho jaata hai?",
    "Generic event ka chhupa kharcha kya hai?"
  ],
  "lesson": [
    "<h3>📮 Teen postcard, ek naya ghar</h3><p>Ravi naye ghar ka pata bank ko teen alag postcards par bhejta hai: ek par street, ek par shehar, ek par pin. Pehla postcard pahuncha hi tha ki bank ka courier nikal gaya.</p><p>Courier ke label par kaunsa pata gaya? Pehle dekho.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "🏷️ Ravi ne ghar badla — courier ko kaunsa address mila?",
      "goal": "Ravi Pune (MG Road 12, 411001) se Bengaluru (Lake View 5, 560001) gaya, aur usi form mein email bhi badla. Profile service har badle field ka alag event bhejta hai. Beech mein order service ke do orders pack hote hain. Lab 51 ka ex1-granular field --trace.",
      "nodes": [
        {
          "id": "prof",
          "icon": "🧑",
          "label": "profile service",
          "x": 150,
          "y": 55
        },
        {
          "id": "ord",
          "icon": "📦",
          "label": "order service",
          "x": 150,
          "y": 295
        },
        {
          "id": "bus",
          "icon": "📬",
          "label": "bus",
          "x": 500,
          "y": 190
        },
        {
          "id": "lab",
          "icon": "🏷️",
          "label": "label service",
          "x": 810,
          "y": 190
        }
      ],
      "edges": [
        {
          "from": "prof",
          "to": "bus"
        },
        {
          "from": "ord",
          "to": "bus"
        },
        {
          "from": "bus",
          "to": "lab"
        }
      ],
      "viz": {
        "w": 910,
        "h": 370
      },
      "vars": [
        {
          "id": "addr",
          "label": "Label service ki copy"
        },
        {
          "id": "labels",
          "label": "Chhape labels"
        }
      ],
      "steps": [
        {
          "title": "Street badli",
          "clock": "msg 1",
          "say": "Pehla event: <b>StreetChanged</b> (Lake View 5). Label service ki copy: Lake View 5, Pune, 411001.",
          "nodes": {
            "prof": {
              "tone": "ok",
              "badge": "save"
            },
            "ord": {
              "tone": "idle",
              "badge": ""
            },
            "bus": {
              "tone": "busy",
              "badge": "street"
            },
            "lab": {
              "tone": "slow",
              "badge": "aadha naya"
            }
          },
          "vars": {
            "addr": "Lake View 5, Pune, 411001",
            "labels": "—"
          },
          "flows": [
            {
              "from": "prof",
              "to": "bus",
              "label": "",
              "tone": "acc"
            },
            {
              "from": "bus",
              "to": "lab",
              "label": "street",
              "tone": "acc"
            }
          ]
        },
        {
          "title": "Order o1 pack hua",
          "clock": "msg 2",
          "say": "Ab bus par order service ka <b>OrderPacked o1</b> aaya. Label service turant label chhaapta hai.",
          "nodes": {
            "prof": {
              "tone": "idle",
              "badge": ""
            },
            "ord": {
              "tone": "ok",
              "badge": "o1"
            },
            "bus": {
              "tone": "busy",
              "badge": "o1"
            },
            "lab": {
              "tone": "slow",
              "badge": "label?"
            }
          },
          "vars": {
            "addr": "Lake View 5, Pune, 411001",
            "labels": "o1: ?"
          },
          "flows": [
            {
              "from": "ord",
              "to": "bus",
              "label": "o1",
              "tone": "acc"
            },
            {
              "from": "bus",
              "to": "lab",
              "label": "o1",
              "tone": "acc"
            }
          ],
          "ask": {
            "q": "o1 ke label par kaunsa address chhapa?",
            "choices": [
              "Lake View 5, Pune, 411001 — nayi street, purana shehar aur purana pin",
              "Lake View 5, Bengaluru, 560001 — Ravi ka poora naya address, jaisa form mein",
              "MG Road 12, Pune, 411001 — poora purana address, kyunki save abhi adhoora hai"
            ],
            "answer": 0,
            "hint": "Label service tak ab tak kaunse events pahunche?",
            "explain": "Label service tak sirf StreetChanged pahuncha tha. City aur pin ke events abhi raste mein the. Toh label par aadha naya, aadha purana address: Lake View 5, Pune, 411001 — aisa ghar kahin nahi hai. Lab: field mode mein 2 mein se 2 labels mile-jule.",
            "choiceExplanations": [
              "Label service tak sirf StreetChanged pahuncha tha. City aur pin ke events abhi raste mein the. Toh label par aadha naya, aadha purana address: Lake View 5, Pune, 411001 — aisa ghar kahin nahi hai. Lab: field mode mein 2 mein se 2 labels mile-jule.",
              "Form mein poora naya address tha, par label service ko teen alag events milne the — abhi sirf ek mila tha.",
              "Label service ne StreetChanged laga diya tha. Purana address ab poora purana bhi nahi raha."
            ]
          }
        },
        {
          "title": "City badli, o2 pack",
          "clock": "msg 3–4",
          "say": "<b>CityChanged</b> (Bengaluru) aaya, phir <b>OrderPacked o2</b>. Label: Lake View 5, Bengaluru, 411001 — pin abhi bhi Pune ka.",
          "nodes": {
            "prof": {
              "tone": "ok",
              "badge": "city"
            },
            "ord": {
              "tone": "ok",
              "badge": "o2"
            },
            "bus": {
              "tone": "busy",
              "badge": "o2"
            },
            "lab": {
              "tone": "bad",
              "badge": "pin purana"
            }
          },
          "vars": {
            "addr": "Lake View 5, Bengaluru, 411001",
            "labels": "o1, o2 dono mile-jule"
          },
          "flows": [
            {
              "from": "prof",
              "to": "bus",
              "label": "city",
              "tone": "acc"
            },
            {
              "from": "ord",
              "to": "bus",
              "label": "o2",
              "tone": "acc"
            },
            {
              "from": "bus",
              "to": "lab",
              "label": "o2",
              "tone": "bad"
            }
          ]
        },
        {
          "title": "Pin aur email",
          "clock": "msg 5–6",
          "say": "<b>PinChanged</b> (560001) ke baad copy sahi hui: Lake View 5, Bengaluru, 560001. Phir EmailChanged. Par o1 aur o2 ke labels chhap chuke.",
          "nodes": {
            "prof": {
              "tone": "ok",
              "badge": "pin, email"
            },
            "ord": {
              "tone": "idle",
              "badge": ""
            },
            "bus": {
              "tone": "ok",
              "badge": ""
            },
            "lab": {
              "tone": "ok",
              "badge": "ab sahi"
            }
          },
          "vars": {
            "addr": "Lake View 5, Bengaluru, 560001",
            "labels": "2 / 2 galat"
          },
          "flows": [
            {
              "from": "prof",
              "to": "bus",
              "label": "pin",
              "tone": "acc"
            },
            {
              "from": "bus",
              "to": "lab",
              "label": "pin",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "Naam",
          "clock": "naam",
          "say": "Ek kaam (ghar badalna) ko field-field ke events mein todna: <b>property sourcing</b>. Har event sach hai, par akela event aadhi kahani hai — aur beech mein padhne wala aadha sach dekhta hai.",
          "nodes": {
            "prof": {
              "tone": "idle",
              "badge": ""
            },
            "ord": {
              "tone": "idle",
              "badge": ""
            },
            "bus": {
              "tone": "idle",
              "badge": ""
            },
            "lab": {
              "tone": "ok",
              "badge": ""
            }
          },
          "vars": {
            "addr": "Lake View 5, Bengaluru, 560001",
            "labels": "2 / 2 galat"
          }
        }
      ],
      "lesson": "Ghar badalna ek kaam hai, par events teen gaye: street, city, pin. Beech mein aaya order aadha naya, aadha purana address dekh gaya. Event ka design field se nahi, business ke kaam se shuru hota hai."
    },
    {
      "type": "cards",
      "title": "📒 \"Balance badla\" — par hua kya?",
      "goal": "Ek aur design ki galti: event mein sirf nayi haalat, ghatna ka naam nahi.",
      "lesson": "Haalat ka event (BalanceUpdated) batata hai kya hai, ghatna ka event (CashWithdrawn) batata hai kya hua. Consumers ko aksar \"kya hua\" chahiye.",
      "steps": [
        {
          "title": "1. Ek din, saat events",
          "say": "Ravi ke khaate mein ek din: salary, do ATM withdrawals (₹2,500, ₹3,000), card fee ₹500, fee ki wapsi ₹500, UPI se ₹2,200 kirane ko, interest. Bank har baar sirf <b>BalanceUpdated { balance, previous }</b> bhejta hai.",
          "ask": {
            "q": "Fraud team ka niyam: \"₹2,000 se bade ATM withdrawals ginno.\" Lab ka state consumer har ₹2,000 se bade debit ko ATM maanta hai. Din ke events par kitne gin lega?",
            "choices": [
              "3 — har ₹2,000 se bada debit ATM lagega, toh ₹2,200 ka UPI bhi gin jaayega",
              "2 — pichhla balance saath hai, toh debit ka type bhi apne aap nikal aayega",
              "0 — BalanceUpdated mein amount nahi hota, toh koi bhi withdrawal nahi dikhega"
            ],
            "answer": 0,
            "hint": "previous aur balance se kya nikalta hai — kitna, ya kyun?",
            "explain": "Lab ka consumer ATM ki wajah nahi pehchaanta; pichhle aur naye balance se sirf badlaav nikalta hai: −2,500, −3,000, −2,200. Har bade debit ko ATM maan ke ₹2,200 ka UPI bhi gin leta hai. Ginti 3; asal ATM withdrawals 2. Lab ex2: state roop mein 3, facts roop mein 2.",
            "choiceExplanations": [
              "Lab ka consumer ATM ki wajah nahi pehchaanta; pichhle aur naye balance se sirf badlaav nikalta hai: −2,500, −3,000, −2,200. Har bade debit ko ATM maan ke ₹2,200 ka UPI bhi gin leta hai. Ginti 3; asal ATM withdrawals 2. Lab ex2: state roop mein 3, facts roop mein 2.",
              "previous se kitna kata, nikal aata hai; kis wajah se, nahi. UPI aur ATM ek jaise dikhte hain.",
              "Badlaav (delta) nikalta hai, isliye debit dikhte hain — bas debit ka type nahi."
            ]
          }
        },
        {
          "title": "2. Fee ka hisaab",
          "say": "Accounts team poochhti hai: \"is mahine card fee kitni lagi, kitni wapas hui?\" BalanceUpdated mein −500 aur +500 dikhte hain — par ₹500 ka koi bhi debit fee ho sakta hai, aur koi bhi credit wapsi."
        },
        {
          "title": "3. Naam",
          "say": "Event mein sirf nayi haalat bhejna, ghatna nahi: <b>state obsession</b>. Ilaaj: jo hua wahi naam — <b>CashWithdrawn</b>, <b>FeeCharged</b>, <b>FeeReversed</b>, <b>UpiPaid</b>. Dudycz: \"think … about what exactly has happened\"."
        },
        {
          "title": "4. Do aur galtiyan",
          "say": "Event jo bas \"kuch hua\" bataye aur har consumer ko owner se poochhna pade: <b>clickbait event</b> — EDA topic 2 (patli khabar) mein naapa tha: calls = events × consumers. Aur har naye consumer ke liye har event mein \"bas ek aur field\" jodte jaana — agle level mein."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Teen design, ek hi din — labels aur verifier",
      "project": "51-event-modeling",
      "exercise": "ex1-granular",
      "goal": "Wahi profile saves teen tareeke se: har field ka event, ek generic ProfileUpdated, aur kaam ke naam ke events.",
      "why": "Node 22+ chahiye. Ek process, tay kram — teeno runs byte-identical. Orders jaan-boojh ke profile ke messages ke beech rakhe gaye hain; asli bus par aisa kabhi-kabhi hota hai.",
      "steps": [
        {
          "text": "Lab folder se: teeno tareeke.",
          "cmd": "cd docker-labs/51-event-modeling && npm start -- ex1-granular",
          "expect": "field    profile-messages=6 mile-jule-labels=2/2 [o1: Lake View 5, Pune, 411001; o2: Lake View 5, Bengaluru, 411001] verifier-jaaga=1 (kaam ka 1)\ngeneric  profile-messages=3 mile-jule-labels=0/2 verifier-jaaga=3 (kaam ka 1)\nintent   profile-messages=4 mile-jule-labels=0/2 verifier-jaaga=1 (kaam ka 1)"
        },
        {
          "text": "Field mode, har message ke baad label service ki copy.",
          "cmd": "npm start -- ex1-granular field --trace",
          "expect": "mode=field | bus ka kram (OrderPacked = alag service ka event)\n  StreetChanged        {\"street\":\"Lake View 5\"}                                     | label-service: Lake View 5, Pune, 411001\n  OrderPacked          {\"order\":\"o1\"}                                               | label-service: Lake View 5, Pune, 411001\n  CityChanged          {\"city\":\"Bengaluru\"}                                         | label-service: Lake View 5, Bengaluru, 411001\n  OrderPacked          {\"order\":\"o2\"}                                               | label-service: Lake View 5, Bengaluru, 411001\n  PinChanged           {\"pin\":\"560001\"}                                             | label-service: Lake View 5, Bengaluru, 560001\n  EmailChanged         {\"email\":\"ravi@new.in\"}                                      | label-service: Lake View 5, Bengaluru, 560001\n  NameChanged          {\"name\":\"Ravi Kumar\"}                                        | label-service: Lake View 5, Bengaluru, 560001\n  PhotoChanged         {\"photo\":\"ravi2.jpg\"}                                        | label-service: Lake View 5, Bengaluru, 560001\nfield    profile-messages=6 mile-jule-labels=2/2 [o1: Lake View 5, Pune, 411001; o2: Lake View 5, Bengaluru, 411001] verifier-jaaga=1 (kaam ka 1)"
        }
      ],
      "observe": {
        "q": "generic mode mein labels sahi (0 / 2), par verifier 3 baar jaaga, kaam ka sirf 1. Kyun?",
        "choices": [
          "Har ProfileUpdated mein kuch bhi ho sakta hai — verifier ko har save par khol ke email dhoondhna pada",
          "Generic event teen baar dobara bheja gaya, kyunki pehli do baar verifier ne ack nahi kiya tha",
          "Verifier ne galti se NameChanged aur PhotoChanged ko bhi email badalne ka event maan liya"
        ],
        "answer": 0,
        "hint": "Generic event ka naam batata hai ki kya badla?",
        "explain": "ProfileUpdated ka naam nahi batata kya badla. Teen saves = teen ProfileUpdated; verifier ko teeno kholne pade, ek mein email mila. Intent mode mein verifier sirf EmailChangeRequested sunta hai: 1 baar jaaga, 1 kaam ka.",
        "choiceExplanations": [
          "ProfileUpdated ka naam nahi batata kya badla. Teen saves = teen ProfileUpdated; verifier ko teeno kholne pade, ek mein email mila. Intent mode mein verifier sirf EmailChangeRequested sunta hai: 1 baar jaaga, 1 kaam ka.",
          "Lab mein koi dobara bhejna nahi — teen alag saves the (ghar + email, naam, photo).",
          "Generic mode mein NameChanged/PhotoChanged events hote hi nahi; teeno saves ProfileUpdated hain."
        ]
      },
      "lesson": "Field ke events ne address toda; ek generic event ne address bachaya par har consumer ko har save kholna pada. Kaam ke naam ke events dono dikkat hataate hain — agle level mein."
    }
  ],
  "interview": {
    "title": "Interview Round — event ka design",
    "instructions": "Pehle socho: event kis kaam ki ghatna hai, aur beech mein padhne wala kya dekhega? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Shipping service kabhi-kabhi aisa address chhaapti hai jo kahin exist nahi karta: nayi street, purana shehar. Profile service StreetChanged, CityChanged, PinChanged alag-alag bhejti hai. Wajah?",
        "choices": [
          "Ek kaam ke field alag events mein gaye; beech mein padhne wale ne aadha naya address dekha",
          "Bus ne events ka kram badal diya, isliye shehar street se pehle aa gaya aur gadbad hui",
          "Shipping service ka cache purana tha; cache ka TTL kam karo toh address sahi aayega",
          "User ne form do baar submit kiya, isliye do alag addresses mix ho gaye shipping mein"
        ],
        "answer": 0,
        "explain": "Ghar badalna ek kaam hai, par teen events gaye. Kram sahi ho tab bhi teen events ke beech ka pal hota hai, aur us pal padhne wala aadha naya address dekhta hai. Ilaaj: ek AddressChanged jismein poora naya address. Lab: field mode mein 2 / 2 labels mile-jule, intent mein 0.",
        "choiceExplanations": [
          "Ghar badalna ek kaam hai, par teen events gaye. Kram sahi ho tab bhi teen events ke beech ka pal hota hai, aur us pal padhne wala aadha naya address dekhta hai. Ilaaj: ek AddressChanged jismein poora naya address. Lab: field mode mein 2 / 2 labels mile-jule, intent mein 0.",
          "Lab mein kram sahi tha — street, city, pin. Dikkat kram ki nahi, beech ke pal ki hai.",
          "Cache ki galti hoti toh poora purana address dikhta; yahan aadha naya hai.",
          "Ek hi submit se teen events bane; mix ka source wahi ek save hai."
        ]
      },
      {
        "q": "Fraud team ko BalanceUpdated { balance, previous } milta hai. Bade ATM withdrawals par alert chahiye, par UPI payments par bhi alert aa jaata hai. Kya badloge?",
        "choices": [
          "Events ko ghatna ke naam do: CashWithdrawn, UpiPaid, FeeCharged — amount aur wajah saath",
          "BalanceUpdated mein current ke saath previous balance bhi bhejo, tab alert sahi aayega",
          "Fraud team ko har alert par bank ka DB khol ke check karne do ki debit kahan se hua",
          "₹2,000 ki jagah ₹2,500 ki hadd kar do, tab UPI ke chhote payments alert nahi denge"
        ],
        "answer": 0,
        "explain": "BalanceUpdated batata hai kitna badla, kya hua nahi. Ghatna ke naam ke events (CashWithdrawn, UpiPaid) se fraud sirf ATM ginta hai. Lab ex2: state roop mein ATM>2000 = 3 (sahi 2), facts mein 2.",
        "choiceExplanations": [
          "BalanceUpdated batata hai kitna badla, kya hua nahi. Ghatna ke naam ke events (CashWithdrawn, UpiPaid) se fraud sirf ATM ginta hai. Lab ex2: state roop mein ATM>2000 = 3 (sahi 2), facts mein 2.",
          "Lab ke state roop mein previous pehle se tha — phir bhi 3 gine. Delta milta hai, wajah nahi.",
          "Har alert par DB kholna clickbait event jaisa hai: event mein kaam ki baat hi nahi.",
          "Hadd badalne se ₹2,600 ka UPI phir alert dega, aur ₹2,400 ka ATM chhoot jaayega."
        ]
      }
    ]
  },
  "success": [
    "Property sourcing se aadha sach kaise dikhta hai, dikha sakte ho",
    "State obsession se kya kho jaata hai, bata sakte ho",
    "Generic event ka kharcha samjha sakte ho"
  ],
  "cards": [
    {
      "front": "Property sourcing?",
      "back": "Ek kaam ko field-field ke events mein todna (StreetChanged, CityChanged…). Beech mein padhne wala aadha naya sach dekhta hai."
    },
    {
      "front": "State obsession?",
      "back": "Event mein sirf nayi haalat (BalanceUpdated), ghatna nahi. Fraud aur audit ko \"kya hua\" chahiye — CashWithdrawn, FeeCharged."
    },
    {
      "front": "Generic ProfileUpdated ka kharcha?",
      "back": "Naam se pata nahi kya badla; har consumer ko har event kholna padta hai. Lab: verifier 3 baar jaaga, kaam ka 1."
    }
  ]
}
]);
})();
