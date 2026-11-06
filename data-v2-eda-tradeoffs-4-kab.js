/* Playlist · EDA Core topic 3: EDA tradeoffs. Source credit: Software Developer Diaries,
   "Here's why Event-Driven Architecture might be a BAD choice" (ttEYKoP53DM) and (Of-br0OG5ic).
   Numbers: docker-labs/48-eda-tradeoffs/captures (ex3-chain: real HTTP, three runs). */
(function () {
const HERO = [{"id": "line", "icon": "📬", "label": "line / events", "x": 140, "y": 105}, {"id": "call", "icon": "⏳", "label": "seedha call", "x": 445, "y": 105}, {"id": "speed", "icon": "🚀", "label": "raftaar badhao", "x": 750, "y": 105}];
const EDGES = [{"from": "line", "to": "call"}, {"from": "call", "to": "speed"}];
VISUALS["et-kab"] = { t: "Teen jawab, teen sawaal: der chalegi? nateeja abhi chahiye? raftaar ka farak roz ka hai?", html: SD.viz.svg(HERO, EDGES, { nodes: { line: {tone:'ok',badge:'der chalegi'}, call: {tone:'acc',badge:'abhi nateeja'}, speed: {tone:'bad',badge:'roz ka farak'} } }, {w:890,h:215}) };
SD.registerLevels('sdd-eda', [
{
  "id": "et-kab",
  "icon": "⚖️",
  "group": "⚖️ EDA Tradeoffs",
  "title": "Tradeoff 4 · Kab — line lagao, seedha bulao, ya raftaar badhao?",
  "badge": "Hisaab Paarkhi",
  "objectives": [
    "Kis haal mein events/line, kis mein seedha call?",
    "Lambi sync chain ko events banane se user ko kya milta hai?",
    "Line kab kaafi nahi, raftaar badhani padti hai?"
  ],
  "lesson": [
    "<h3>⚖️ Teen sawaal, teen jawab</h3><p>Line bheed sambhaalti hai, consumer ke band rehne mein madad karti hai — par user ka intezaar nahi mitaati, aur roz ka raftaar ka farak nahi bharti. Har situation mein sahi raasta chuno.</p>"
  ],
  "stages": [
    {
      "type": "bins",
      "title": "⚖️ Line lagao, seedha bulao, ya raftaar badhao?",
      "instructions": "Har situation mein teen sawaal: user abhi nateeja maang raha hai? Der chalegi? Aane aur nikalne ka farak thodi der ka hai ya roz ka?",
      "bins": [
        {
          "id": "line",
          "label": "📬 Line / events"
        },
        {
          "id": "call",
          "label": "⏳ Seedha call"
        },
        {
          "id": "speed",
          "label": "🚀 Raftaar badhao ya kaam ghatao"
        }
      ],
      "items": [
        {
          "text": "Signup ke baad welcome email, CRM entry aur analytics — teeno alag, thodi der chalegi",
          "bin": "line",
          "explain": "Alag reactions jo baad mein ho sakti hain: ek khabar, teen subscribers (fan-out). Signup ka jawab email, CRM aur analytics ka intezaar na kare."
        },
        {
          "text": "Checkout par cart ka total abhi dikhana hai; user screen par ruka hai",
          "bin": "call",
          "explain": "User abhi nateeja maang raha hai. Line lagao toh bhi user ko total ka intezaar karna hi hai — bas \"pending\" ke saath."
        },
        {
          "text": "Login: password sahi hai ya nahi, user khada intezaar kar raha hai",
          "bin": "call",
          "explain": "Faisla abhi chahiye aur agla kadam password sahi hone ke faisle par tika hai. Seedha call, timeout ke saath."
        },
        {
          "text": "Har minute 10,000 photos aati hain, thumbnail-service roz 200/min hi banati hai",
          "bin": "speed",
          "explain": "Roz ka 50 guna farak. Line har minute 9,800 badhegi. Workers badhao, ya kaam ghatao (chhota size, sampling)."
        },
        {
          "text": "Diwali sale ke 10 minute 5 guna orders; analytics ek ghanta baad bhi chalega",
          "bin": "line",
          "explain": "Thodi der ki bheed aur der manzoor: line burst ko apni raftaar se nikalne deti hai. Backlog-age par nazar rakho."
        },
        {
          "text": "Report-service 2 ghante deploy ke liye band; reports subah tak chahiye",
          "bin": "line",
          "explain": "Producer aur consumer waqt se alag. Retention 2 ghante se kaafi lambi ho, tabhi kaam bachega."
        },
        {
          "text": "Payment → stock → confirm; user screen par \"order confirmed\" ka intezaar kar raha hai",
          "bin": "call",
          "explain": "Har kadam ko pichhle ka nateeja chahiye aur user nateeja maang raha hai. Lab ke teen runs: events ka pehla jawab \"pending\" (median 4–10 ms), safal orders ka confirm median 101.5–149.5 ms; direct ka confirm median 85–108 ms."
        },
        {
          "text": "Search index roz thoda aur peeche; sabse purane message ki umar har din badh rahi hai",
          "bin": "speed",
          "explain": "Umar roz badhna = nikalna aane se kam. Line akeli consumer ki kam raftaar nahi badhaayegi; consumers badhao ya index ka kaam halka karo."
        }
      ]
    },
    {
      "type": "cards",
      "title": "🔗 Jab har kadam ko pichhle ka nateeja chahiye",
      "goal": "Lab 48 ex3-chain: payment (30 ms) → stock (20 ms) → confirm (10 ms), asli HTTP, teen runs. Order #4 ka gulab-jamun stock mein khatam.",
      "lesson": "Is lab ka events raasta pehle pending deta hai; zaroori kaam ka intezaar mitta nahi. User ko abhi nateeja chahiye toh seedha call; der chal sakti ho toh events — saath mein failure ki khabar, order ki pehchaan aur pending ki deadline.",
      "steps": [
        {
          "title": "1. Jaldi jawab = jaldi kaam?",
          "say": "Teen runs ke median. Direct: pehla jawab hi <b>confirmed</b> — 83–101 ms (safal orders 85–108 ms). Events: pehla jawab <b>pending</b>, 4–10 ms; safal orders confirmed 101.5–149.5 ms (har hop par polling).",
          "ask": {
            "q": "Events ne pehla jawab ~90 ms se ~10 ms kar diya. Kya order jaldi confirm hua?",
            "choices": [
              "Nahi — jaldi wala jawab sirf pending tha; confirm har run mein direct se der se hua",
              "Haan — jawab 10 ms mein aaya, matlab order bhi 10 ms mein confirm ho gaya",
              "Haan — events mein kaam parallel chalta hai, isliye confirm 30 ms mein hua"
            ],
            "answer": 0,
            "hint": "Jawab kya keh raha hai: confirmed ya pending?",
            "explain": "Jaldi jawab ek alag vaada hai: \"le liya\", \"ho gaya\" nahi. Is chain mein har kadam pichhle ke nateeje par tika hai, toh events ne kaam parallel nahi kiya — har hop par line aur polling ka waqt juda.",
            "choiceExplanations": [
              "Jaldi jawab ek alag vaada hai: \"le liya\", \"ho gaya\" nahi. Is chain mein har kadam pichhle ke nateeje par tika hai, toh events ne kaam parallel nahi kiya — har hop par line aur polling ka waqt juda.",
              "Pending aur confirmed alag haalat hain. Confirmed ke liye user ko phir poochhna pada.",
              "payment → stock → confirm ek ke baad ek hain; events se payment, stock aur confirm ka kram nahi badla."
            ]
          }
        },
        {
          "title": "2. Fail hua order",
          "say": "Direct: #4 ka error 64–85 ms mein seedha user tak: \"stock: gulab-jamun khatam\". Events, failure par chup: 1,500 ms baad bhi <b>pending</b>, teeno runs mein. Events + OrderFailed: 86–96 ms mein <b>failed</b>."
        },
        {
          "title": "3. Video ka decision tree — sudhaar ke saath",
          "say": "Video ke sawaal: user abhi jawab maang raha hai? Ek ghatna par kai alag kaam? Services ki raftaar alag? Teams alag deploy karti hain? Teen smells: 3 se zyada sync hops, ek service jo 6 services ko bulati hai, monolith ka ek dheema hissa.",
          "ask": {
            "q": "Video kehta hai: 3 se zyada sync hops ho toh event-driven bana do. Kab galat hai?",
            "choices": [
              "Jab user ko aakhri nateeja abhi chahiye — events se zaroori kaam ka intezaar nahi mitta",
              "Kabhi nahi — hops 3 se zyada hon toh events hamesha har kaam jaldi poora karte hain",
              "Jab hops HTTP par hon — gRPC par hops ho toh events banana hamesha sahi rehta hai"
            ],
            "answer": 0,
            "hint": "Video ka pehla sawaal kya tha?",
            "explain": "Video ka pehla sawaal hi jawab hai: caller ko abhi jawab chahiye toh seedha call. Lambi chain ka ilaaj pehle hops ghatana hai (parallel calls, data paas rakhna); events tab, jab nateeja baad mein chal sakta ho.",
            "choiceExplanations": [
              "Video ka pehla sawaal hi jawab hai: caller ko abhi jawab chahiye toh seedha call. Lambi chain ka ilaaj pehle hops ghatana hai (parallel calls, data paas rakhna); events tab, jab nateeja baad mein chal sakta ho.",
              "Lab ke teen runs mein events ki chain ka confirm median direct se zyada raha (101.5–149.5 vs 85–108 ms).",
              "Protocol se farak nahi padta; faisla is baat se karo ki user nateeja abhi maang raha hai ya nahi."
            ]
          }
        },
        {
          "title": "4. Naam",
          "say": "Ek khabar, kai alag kaam: <b>fan-out</b>. Producer aur consumer waqt se alag: <b>temporal decoupling</b>. Bheed ko line se barabar karna: <b>load leveling</b>. Har khabar mein order ki pehchaan: <b>correlation id</b>. \"Pending, baad mein confirmed\" <b>asynchronous processing</b> ka status flow hai; is flow ka kharcha status, deadline aur failure ki khabar hai. (<b>Eventual consistency</b> alag cheez hai: alag data copies kuch der alag dikh sakti hain aur updates pahunchne par milti hain.)"
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Teen raaste ki chain — asli HTTP par",
      "project": "48-eda-tradeoffs",
      "exercise": "ex3-chain",
      "goal": "Paanch Node processes: api, broker, payment, stock, confirm. Paanch orders, teen raaste.",
      "why": "Node 18+ chahiye. Tool apne processes khud chalata aur band karta hai (ports 5700–5704). Timing har run mein thodi badalti hai; neeche lab ka pehla captured run hai, aur README mein teen runs ki range.",
      "steps": [
        {
          "text": "Lab folder se: direct, events, events + OrderFailed.",
          "cmd": "cd docker-labs/48-eda-tradeoffs && npm start -- ex3-chain",
          "expect": "== direct\n  #101 thali       jawab 399 ms | aakhri haalat  399 ms | confirmed\n  #102 thali       jawab 105 ms | aakhri haalat  105 ms | confirmed\n  #103 thali       jawab 101 ms | aakhri haalat  101 ms | confirmed\n  #104 gulab-jamun jawab  85 ms | aakhri haalat   85 ms | error (stock: gulab-jamun khatam)\n  #105 thali       jawab 101 ms | aakhri haalat  101 ms | confirmed\n  median jawab (paanchon) 101 ms · median confirmed (4 safal) 103 ms\n\n== events (failure par chup)\n  #201 thali       jawab  18 ms | aakhri haalat  357 ms | confirmed\n  #202 thali       jawab   9 ms | aakhri haalat  158 ms | confirmed\n  #203 thali       jawab  14 ms | aakhri haalat  141 ms | confirmed\n  #204 gulab-jamun jawab  10 ms | aakhri haalat    — | pending (1500 ms tak)\n  #205 thali       jawab   9 ms | aakhri haalat  130 ms | confirmed\n  median jawab (paanchon) 10 ms · median confirmed (4 safal) 149.5 ms\n\n== events + OrderFailed\n  #301 thali       jawab   8 ms | aakhri haalat  123 ms | confirmed\n  #302 thali       jawab   9 ms | aakhri haalat  117 ms | confirmed\n  #303 thali       jawab  10 ms | aakhri haalat  125 ms | confirmed\n  #304 gulab-jamun jawab  18 ms | aakhri haalat   96 ms | failed (stock: gulab-jamun khatam)\n  #305 thali       jawab   9 ms | aakhri haalat  127 ms | confirmed\n  median jawab (paanchon) 9 ms · median confirmed (4 safal) 124 ms"
        },
        {
          "text": "Raftaar ka ilaaj: roz ke 10,000/min par 50 workers.",
          "cmd": "npm start -- ex1-level --profile sustained --workers 50",
          "expect": "profile=sustained workers=50 queue=true | capacity 10000/min\n  1 min  aaye=10000 hue=10000 reject=0 line=0 sabse-purana=0 min\n  2 min  aaye=20000 hue=20000 reject=0 line=0 sabse-purana=0 min\n  3 min  aaye=30000 hue=30000 reject=0 line=0 sabse-purana=0 min\n  4 min  aaye=40000 hue=40000 reject=0 line=0 sabse-purana=0 min\n  5 min  aaye=50000 hue=50000 reject=0 line=0 sabse-purana=0 min\n  6 min  aaye=60000 hue=60000 reject=0 line=0 sabse-purana=0 min\n  7 min  aaye=70000 hue=70000 reject=0 line=0 sabse-purana=0 min\n  8 min  aaye=80000 hue=80000 reject=0 line=0 sabse-purana=0 min\n  9 min  aaye=90000 hue=90000 reject=0 line=0 sabse-purana=0 min\n 10 min  aaye=100000 hue=100000 reject=0 line=0 sabse-purana=0 min\npeak line=0 (1 min) · khaali hui=line bani hi nahi · sabse lamba intezaar=0 min · reject=0"
        }
      ],
      "observe": {
        "q": "Events (failure par chup) mein #204 1,500 ms baad bhi pending. Events + OrderFailed mein #304 ko failed mila. Asli farak kya hai?",
        "choices": [
          "stock ne failure ki khabar bheji aur api ne padhi — bina khabar ke api ko pata hi nahi",
          "Doosre run mein stock-service tez thi, isliye #304 ka failure jaldi pakda gaya",
          "#204 ka order bada tha, isliye stock ne #204 ko process karne mein zyada waqt liya"
        ],
        "answer": 0,
        "hint": "Dono mein stock ne gulab-jamun par kya kiya, aur api tak kya pahuncha?",
        "explain": "Dono mein stock fail hua. Chup wale raaste mein khabar kahin nahi gayi, toh api ke liye order hamesha pending. OrderFailed bhejne aur api ke failed topic padhne par user ko 86–96 ms mein failed dikha.",
        "choiceExplanations": [
          "Dono mein stock fail hua. Chup wale raaste mein khabar kahin nahi gayi, toh api ke liye order hamesha pending. OrderFailed bhejne aur api ke failed topic padhne par user ko 86–96 ms mein failed dikha.",
          "Stock ka kaam dono mein 20 ms ka hai. Farak khabar bhejne ka hai, raftaar ka nahi.",
          "Dono orders mein ek hi item (gulab-jamun) hai. #204 ka stock step fail hua; #204 ki failure ki khabar api tak nahi aayi."
        ]
      },
      "lesson": "Chain mein user ko nateeja abhi chahiye toh direct jaldi aur seedha hai. Events tab, jab der chal sakti ho — aur tab failure ki khabar aur pending ki deadline design ka hissa hain."
    }
  ],
  "interview": {
    "title": "Interview Round — events kab, kab nahi?",
    "instructions": "Pehle socho: user abhi kya maang raha hai, aur kya baad mein ho sakta hai. Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Checkout 4 sync hops ka hai (cart → pricing → billing → invoice), aur user invoice number ka intezaar karta hai. Team kehti hai: hops zyada hain, events bana do. Aap kya kahoge?",
        "choices": [
          "User ko invoice abhi chahiye toh events intezaar nahi hataayenge; pehle hops ghatao",
          "Events bana do — events mein har hop parallel chalta hai, toh invoice turant aayega",
          "Events bana do — user ko pending dikhao aur invoice email se bhej do, koi farak nahi",
          "Hops ko gRPC par le jao — gRPC mein hops ka waqt nahi judta, toh chain chhoti ho jaati hai"
        ],
        "answer": 0,
        "explain": "Har hop pichhle ke nateeje par tika hai aur user nateeja maang raha hai. Is lab ke events raaste mein pehla jawab \"pending\" hai, kaam jaldi nahi hota (confirm median 101.5–149.5 ms vs direct 85–108 ms). Pehle chain chhoti karo; invoice ko baad mein bhejna product ka faisla hai, sirf technical nahi.",
        "choiceExplanations": [
          "Har hop pichhle ke nateeje par tika hai aur user nateeja maang raha hai. Is lab ke events raaste mein pehla jawab \"pending\" hai, kaam jaldi nahi hota (confirm median 101.5–149.5 ms vs direct 85–108 ms). Pehle chain chhoti karo; invoice ko baad mein bhejna product ka faisla hai, sirf technical nahi.",
          "Pichhle ke nateeje par tike kadam parallel nahi chal sakte — events se bhi nahi.",
          "Pending + email user ka vaada badalta hai. Invoice baad mein bhejne ka faisla product ka hai; \"koi farak nahi\" sach nahi.",
          "gRPC call bhi network hop hai; gRPC hop ka waqt bhi judta hai."
        ]
      },
      {
        "q": "Order-service email, CRM, analytics, loyalty, fraud-score aur invoice ko bulata hai. Product ka niyam: fraud-score aur invoice number order confirm karne se pehle chahiye; email, CRM, analytics aur loyalty baad mein chal sakte hain. Kise events par le jaoge?",
        "choices": [
          "Email, CRM, analytics aur loyalty events par; fraud-score aur invoice abhi ke jawab wale raaste par",
          "Saare 6 — ek service ka 6 ko bulana smell hai, toh sab events par hone chahiye",
          "Koi nahi — order-service ke liye 6 seedhe calls hamesha events se simple rehte hain",
          "Sirf fraud-score — fraud-score sabse dheema hai, toh fraud-score ko line mein daal ke order turant confirm karo"
        ],
        "answer": 0,
        "explain": "Order confirm karne se pehle fraud-score aur invoice number chahiye. Email, CRM, analytics aur loyalty thodi der baad chal sakte hain, toh chaaron kaam OrderPlaced se alag chalao. Faisla product ke niyam se aaya, sirf chhe calls ki ginti se nahi.",
        "choiceExplanations": [
          "Order confirm karne se pehle fraud-score aur invoice number chahiye. Email, CRM, analytics aur loyalty thodi der baad chal sakte hain, toh chaaron kaam OrderPlaced se alag chalao. Faisla product ke niyam se aaya, sirf chhe calls ki ginti se nahi.",
          "Product ke niyam se fraud-score aur invoice number confirm se pehle chahiye. Smell sab kuch events par le jaane ka niyam nahi.",
          "6 seedhe calls mein ek ki failure poore order ko rok sakti hai. Baad wale kaam alag karna faayda deta hai.",
          "Fraud-score order ke faisle ke liye chahiye. Bina score order confirm karna galat vaada hai."
        ]
      }
    ]
  },
  "success": [
    "Situation dekh ke line/events, seedha call ya raftaar badhana chun sakte ho",
    "Lambi chain ko events banane ka asli asar (pending, der, failure ki khabar) bata sakte ho",
    "Video ke decision tree ko sahi shart ke saath laga sakte ho"
  ],
  "cards": [
    {
      "front": "Events kab nahi?",
      "back": "User ko turant aakhri nateeja chahiye aur har kadam pichhle par tika ho, toh chhoti direct chain aksar seedhi padti hai. Lab ka events raasta pehle pending deta hai; final ka intezaar jodo toh wait phir bhi rahega."
    },
    {
      "front": "Events kab haan?",
      "back": "Alag reactions (fan-out), thodi der ki bheed, consumer ka band rehna — jab der manzoor ho."
    },
    {
      "front": "Events ka chhupa kharcha?",
      "back": "Pending status, failure ki khabar, order ki pehchaan (correlation id), deadline aur retention ka hisaab."
    }
  ]
}
]);
})();
