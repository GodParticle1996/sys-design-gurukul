/* Playlist · EDA Core topic 4: EDA races. Source credit: Software Developer Diaries (skb6-JaBNQw).
   Numbers: docker-labs/49-eda-races/captures. */
(function () {
const HERO = [{"id": "key", "icon": "🔑", "label": "kram chahiye?", "x": 140, "y": 105}, {"id": "ver", "icon": "🔢", "label": "do writers?", "x": 445, "y": 105}, {"id": "idem", "icon": "🧾", "label": "dobara aa sakta?", "x": 750, "y": 105}];
const EDGES = [{"from": "key", "to": "ver"}, {"from": "ver", "to": "idem"}];
VISUALS["er-kab"] = { t: "Har consumer ke liye teen sawaal: kram, ek saath likhne wale, aur redelivery.", html: SD.viz.svg(HERO, EDGES, { nodes: { key: {tone:'acc',badge:'ek key ek consumer'}, ver: {tone:'acc',badge:'version / atomic'}, idem: {tone:'acc',badge:'stable id'} } }, {w:890,h:215}) };
SD.registerLevels('sdd-eda', [
{
  "id": "er-kab",
  "icon": "⚖️",
  "group": "🏁 EDA Races",
  "title": "Races 4 · Kab — kaunsi gadbad, kaunsa ilaaj?",
  "badge": "Race Paarkhi",
  "objectives": [
    "Situation dekh ke sahi ilaaj (key, version, stable id) kaise chunein?",
    "Kram kab zaroori hai — set vs delta, aur niyam ka asar?",
    "Requeue kram kyun nahi bachata?"
  ],
  "lesson": [
    "<h3>⚖️ Teen sawaal, har consumer ke liye</h3><p>Kram chahiye? Do writers? Dobara aa sakta hai? In teen sawaalon se har consumer ka ilaaj tay hota hai. Ab situations mein sahi ilaaj chuno.</p>"
  ],
  "stages": [
    {
      "type": "bins",
      "title": "⚖️ Kaunsi gadbad, kaunsa ilaaj?",
      "instructions": "Har situation mein poochho: ek cheez ke events kram mein chahiye? Do writers ek hi value badalte hain? Kaam ho ke bhi message dobara aa sakta hai?",
      "bins": [
        {
          "id": "key",
          "label": "🔑 Ek key ek consumer"
        },
        {
          "id": "ver",
          "label": "🔢 Version ya atomic update"
        },
        {
          "id": "idem",
          "label": "🧾 Stable id, kaam ke saath"
        }
      ],
      "items": [
        {
          "text": "Order ki haalat ke events (placed → delivered), 6 consumers; order kabhi peeche wali haalat dikhata hai",
          "bin": "key",
          "explain": "Ek order ke events ek waqt ek consumer ko: Kafka mein key = order id, RabbitMQ mein single active consumer ya key ke hisaab se queues."
        },
        {
          "text": "Wallet top-up: do consumers balance padhte hain, jodte hain, likhte hain; kabhi top-up gayab",
          "bin": "ver",
          "explain": "Khoya update. DB ko khud jodne do (balance = balance + x), ya version ki shart ke saath likho."
        },
        {
          "text": "Payment consumer charge likh ke ack se pehle crash ho sakta hai",
          "bin": "idem",
          "explain": "Redelivery hogi. Payment id ko charge ke saath ek transaction mein unique likho."
        },
        {
          "text": "Seat booking: do consumers ek hi seat ko \"khaali\" padh ke dono book kar dete hain",
          "bin": "ver",
          "explain": "Shart ke saath likho: UPDATE … SET booked = 1 WHERE seat = ? AND booked = 0 — sirf ek ki row badlegi."
        },
        {
          "text": "Truck tracking: har truck ki location updates kram mein lagni chahiye",
          "bin": "key",
          "explain": "Key = truck id. Ek truck ke updates ek partition / ek consumer par kram mein."
        },
        {
          "text": "Email consumer crash ke baad restart hua, aur kuch logon ko welcome email do baar gaya",
          "bin": "idem",
          "explain": "Email apni DB ke transaction mein nahi jaata. Email provider idempotency key leta ho toh har retry par wahi event id bhejo. Key na le toh sirf local \"sent\" row se ek hi email ki guarantee nahi milti: bhejne se pehle likha toh email chhoot sakta hai, baad mein likha toh crash par do baar."
        },
        {
          "text": "Refund event dobara aaya; refund payment gateway par hota hai",
          "bin": "idem",
          "explain": "Gateway apni DB ke transaction mein nahi aata. Gateway ko refund id idempotency key ke roop mein bhejo."
        },
        {
          "text": "Chat mein ek conversation ke messages ulte kram mein dikh rahe hain",
          "bin": "key",
          "explain": "Key = conversation id. Alag conversations parallel chalein, ek conversation ke messages kram mein."
        }
      ]
    },
    {
      "type": "cards",
      "title": "🧮 Kram kab zaroori, aur kab nahi?",
      "goal": "Lab 49 ka ex2 (bina broker): wahi events, sahi kram aur ulta kram.",
      "lesson": "Set events (haalat = X) ko kram chahiye. Delta (+x) jodne mein kram se farak nahi — jab tak koi niyam beech ki haalat par tika na ho. Line ke peeche bhejna kram ki guarantee nahi.",
      "steps": [
        {
          "title": "1. Set vs delta",
          "say": "Set events (balance = 90, phir 100): sahi kram <b>100</b>, ulta kram <b>90</b>. Delta events (+100, −30) 1,000 se: dono kram <b>1,070</b>. Video ki balance wali kahani set events ki thi, par code mein delta the — isliye \"bad consumer\" ka balance bhi sahi aaya.",
          "ask": {
            "q": "Delta events kram se azaad hain. Toh delta par kram ki fikar kabhi nahi?",
            "choices": [
              "Fikar hai jab niyam beech ki haalat par tika ho — jaise \"balance minus mein nahi\"",
              "Kabhi nahi — jodna kram se azaad hai, toh delta par koi niyam asar nahi karta",
              "Hamesha — delta ko set events mein badle bina kram kabhi theek nahi hota"
            ],
            "answer": 0,
            "hint": "Lab mein 0 se +100, −30 ko \"minus mein nahi\" niyam ke saath chalaya.",
            "explain": "Niyam ke saath 0 se: sahi kram 70, ulta kram 100 — −30 pehle aaya, balance minus mein jaata, toh reject hua. Jodna kram se azaad hai, par beech ki haalat par niyam (overdraft, stock zero se neeche nahi) kram ko phir zaroori bana deta hai.",
            "choiceExplanations": [
              "Niyam ke saath 0 se: sahi kram 70, ulta kram 100 — −30 pehle aaya, balance minus mein jaata, toh reject hua. Jodna kram se azaad hai, par beech ki haalat par niyam (overdraft, stock zero se neeche nahi) kram ko phir zaroori bana deta hai.",
              "Lab: \"minus mein nahi\" niyam ke saath ulta kram 100 deta hai, sahi kram 70.",
              "Bina niyam ke delta dono kram mein 1,070 dete hain. Har jagah set events nahi chahiye."
            ]
          }
        },
        {
          "title": "2. Line ke peeche bhej do?",
          "say": "Video ka ek tareeka: purana message aaye toh requeue kar do, \"message baad mein phir aayega\". Par kai consumers par RabbitMQ docs: \"any redelivery can change order\".",
          "ask": {
            "q": "Ulte kram mein aaya message line ke peeche bhejna kram theek karta hai?",
            "choices": [
              "Guarantee nahi — wapas aaya message doosre consumer ko kisi bhi kram mein mil sakta hai",
              "Haan — line ke peeche bhejte hi broker message ko sequence number ke hisaab se sahi jagah par laga deta hai",
              "Haan — requeue sirf ek baar hota hai, toh doosri baar ka kram pakka sahi hota hai"
            ],
            "answer": 0,
            "hint": "Requeue ke baad message kisko, kab milega?",
            "explain": "Requeue message ko phir line mein daalta hai; kai consumers mein se koi bhi message ko kisi bhi kram mein utha sakta hai, aur baar-baar ghoom sakta hai. Kram chahiye toh key se routing (ek key ek consumer), ya kram jaanch ke buffer + timeout.",
            "choiceExplanations": [
              "Requeue message ko phir line mein daalta hai; kai consumers mein se koi bhi message ko kisi bhi kram mein utha sakta hai, aur baar-baar ghoom sakta hai. Kram chahiye toh key se routing (ek key ek consumer), ya kram jaanch ke buffer + timeout.",
              "Broker sahi kram nahi jaanta; requeue sirf wapas line mein daalta hai.",
              "Requeue kitni baar bhi ho sakta hai, aur har baar kram ki guarantee nahi."
            ]
          }
        },
        {
          "title": "3. Har consumer ka checklist",
          "say": "Naya consumer likhne se pehle teen sawaal: <b>1.</b> Ek cheez (order, truck, chat) ke events kram mein chahiye? → key se routing. <b>2.</b> Do writers ek hi value badal sakte hain? → atomic update ya version. <b>3.</b> Kaam ho ke bhi message dobara aa sakta hai? (Hamesha haan.) → stable id, kaam ke saath ek transaction mein."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Phantom failure, slow motion mein — bina key aur key ke saath",
      "project": "49-eda-races",
      "exercise": "ex0-slowmo",
      "goal": "Wahi crash nakli ghadi par: pehle bina key, phir payment id key ke saath.",
      "why": "Node 24+ chahiye. Tool wahi broker aur wahi charge() code RAM SQLite par chalata hai; teeno runs byte-identical.",
      "steps": [
        {
          "text": "Lab folder se: bina key.",
          "cmd": "cd docker-labs/49-eda-races && npm start -- ex0-slowmo --story phantom --mode none",
          "expect": "story=phantom mode=none | nakli ghadi; lab ke tay ms\n  0 ms  p1 (u1, ₹100) line mein | charges=— line=1\n 10 ms  consumer ne p1 uthaya (attempt 1) | charges=— line=1\n 20 ms  charge DB mein likha | charges=p1 line=1\n 21 ms  ack se pehle consumer crash — broker ko ack nahi mila | charges=p1 line=1\n300 ms  consumer dobara chalu; p1 abhi lease par | charges=p1 line=1\n310 ms  lease khatam: p1 dobara mila (attempt 2) | charges=p1 line=1\n320 ms  phir se charge likha, ack | charges=p1,p1 line=0"
        },
        {
          "text": "Payment id key ke saath.",
          "cmd": "npm start -- ex0-slowmo --story phantom --mode paymentId",
          "expect": "story=phantom mode=paymentId | nakli ghadi; lab ke tay ms\n  0 ms  p1 (u1, ₹100) line mein | charges=— line=1\n 10 ms  consumer ne p1 uthaya (attempt 1) | charges=— line=1\n 20 ms  charge DB mein likha | charges=p1 line=1\n 21 ms  ack se pehle consumer crash — broker ko ack nahi mila | charges=p1 line=1\n300 ms  consumer dobara chalu; p1 abhi lease par | charges=p1 line=1\n310 ms  lease khatam: p1 dobara mila (attempt 2) | charges=p1 line=1\n320 ms  paymentId pehle se hai: charge nahi, sirf ack | charges=p1 line=0"
        }
      ],
      "observe": {
        "q": "Dono runs mein 310 ms par p1 dobara mila (attempt 2). Farak kahan se aaya?",
        "choices": [
          "paymentId mode mein p1 ki key pehle se thi — doosri baar charge nahi, sirf ack",
          "paymentId mode mein broker ne p1 dobara bheja hi nahi, isliye sirf ek charge bana",
          "none mode mein consumer do baar crash hua, isliye do charge ban gaye"
        ],
        "answer": 0,
        "hint": "Dono mein broker ne kya kiya? Consumer ne kya alag kiya?",
        "explain": "Broker dono mein same: ack nahi mila, lease ke baad p1 dobara diya. Farak consumer ka: none mode bina jaanch phir charge likhta hai (p1,p1); paymentId mode key pehle se dekh ke sirf ack karta hai (p1).",
        "choiceExplanations": [
          "Broker dono mein same: ack nahi mila, lease ke baad p1 dobara diya. Farak consumer ka: none mode bina jaanch phir charge likhta hai (p1,p1); paymentId mode key pehle se dekh ke sirf ack karta hai (p1).",
          "Dono runs mein 310 ms par p1 attempt 2 mila — broker ne dono mein dobara bheja.",
          "Crash ek hi baar (21 ms) hua. Doosra charge redelivery par bina jaanch likhne se aaya."
        ]
      },
      "lesson": "Redelivery broker ka kaam hai aur hogi. Duplicate se bachna consumer ka kaam hai: stable id, kaam ke saath ek transaction mein."
    }
  ],
  "interview": {
    "title": "Interview Round — design review",
    "instructions": "Teen sawaal poochho: kram, do writers, redelivery. Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Inventory service \"stock = N\" events leti hai; 3 consumers; kabhi stock purani value par atak jaata hai. Team kehti hai: delta events (−1) bhejo, phir kram ki fikar nahi. Sahi?",
        "choices": [
          "Aadha sahi — delta kram se azaad, par \"stock 0 se neeche nahi\" jaisa niyam kram ko zaroori banata hai",
          "Poora sahi — delta events par kram ka koi bhi niyam kabhi koi asar nahi karta, chahe stock kitna ho",
          "Galat — delta events par bhi stock = N wale events jaisa hi ulta kram ka nuksaan hamesha hota hai",
          "Galat — inventory mein events kabhi use nahi karne chahiye, inventory mein sirf seedhe calls hi chalte hain"
        ],
        "answer": 0,
        "explain": "Set events ulte kram mein purani value chhod dete hain; delta jodne mein kram se farak nahi. Par stock ke niyam (0 se neeche nahi) ulte kram mein galat reject kar sakte hain — lab mein \"minus mein nahi\" niyam ke saath ulta kram 100, sahi 70. Aur do consumers ek hi stock badlein toh atomic update chahiye.",
        "choiceExplanations": [
          "Set events ulte kram mein purani value chhod dete hain; delta jodne mein kram se farak nahi. Par stock ke niyam (0 se neeche nahi) ulte kram mein galat reject kar sakte hain — lab mein \"minus mein nahi\" niyam ke saath ulta kram 100, sahi 70. Aur do consumers ek hi stock badlein toh atomic update chahiye.",
          "Lab: niyam ke saath ulta kram 100 deta hai, sahi kram 70. Niyam kram ko phir zaroori banata hai.",
          "Bina niyam ke delta dono kram mein ek hi nateeja dete hain (lab: 1,070).",
          "Events inventory mein chal sakte hain; bas kram, writers aur redelivery ka intezaam chahiye."
        ]
      },
      {
        "q": "Naye order consumer ka review: shared queue, 5 consumers, \"order = event ki haalat\" likhta hai, ack processing ke baad, koi dedupe nahi. Sabse pehle kya badloge?",
        "choices": [
          "Order id se routing (kram) aur event id se dedupe — dono, kyunki dono gadbad ho sakti hain",
          "Sirf consumers 5 se 1 kar do — ek consumer se kram bhi bachega aur duplicate bhi nahi",
          "Ack processing se pehle kar do — tab duplicate kabhi nahi aayega",
          "Sirf dedupe — shared queue FIFO hai, toh kram apne aap theek rahega"
        ],
        "answer": 0,
        "explain": "Shared queue + 5 consumers = ulta kram mumkin (lab: har run mein 2–3 ulte writes). Ack processing ke baad = crash par redelivery (lab: p1 do baar). Dono ka ilaaj alag: key se routing, aur stable id se dedupe.",
        "choiceExplanations": [
          "Shared queue + 5 consumers = ulta kram mumkin (lab: har run mein 2–3 ulte writes). Ack processing ke baad = crash par redelivery (lab: p1 do baar). Dono ka ilaaj alag: key se routing, aur stable id se dedupe.",
          "Ek consumer se kram bachta hai, par crash ke baad redelivery phir bhi hogi — dedupe chahiye.",
          "Pehle ack aur phir crash = message gaya, kaam nahi hua (at-most-once). Kaam khona bhi galat hai.",
          "Line FIFO deti hai, par 5 consumers alag raftaar se likhte hain — kram toot-ta hai."
        ]
      }
    ]
  },
  "success": [
    "Situation dekh ke key routing, version/atomic ya stable id chun sakte ho",
    "Set aur delta events mein kram ka farak, aur niyam ka asar bata sakte ho",
    "Naye consumer ka teen-sawaal review kar sakte ho"
  ],
  "cards": [
    {
      "front": "Set vs delta events?",
      "back": "Set (haalat = X) ko kram chahiye. Delta (+x) jodne mein nahi — jab tak beech ki haalat par niyam na ho."
    },
    {
      "front": "Requeue se kram theek?",
      "back": "Nahi. Kai consumers par redelivery kram badal sakti hai. Key se routing ya buffer + timeout."
    },
    {
      "front": "Consumer ka teen-sawaal checklist?",
      "back": "Kram chahiye? → key. Do writers? → atomic/version. Dobara aa sakta hai? → stable id, kaam ke saath."
    }
  ]
}
]);
})();
