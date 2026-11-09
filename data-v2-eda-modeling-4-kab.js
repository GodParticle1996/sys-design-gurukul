/* Playlist · EDA Core topic 6: Event modeling. Source credit: Software Developer Diaries,
   "4 Event-Modeling Mistakes in Event-Driven Architectures" (m3mY3Ra-BcI); anti-patterns from Oskar Dudycz.
   Numbers: docker-labs/51-event-modeling/captures. */
(function () {
const HERO = [{"id": "kaam", "icon": "📛", "label": "kaunsa kaam?", "x": 140, "y": 105}, {"id": "flow", "icon": "✉️", "label": "apna workflow?", "x": 445, "y": 105}, {"id": "copy", "icon": "🧮", "label": "kisi aur event mein?", "x": 750, "y": 105}];
const EDGES = [{"from": "kaam", "to": "flow"}, {"from": "flow", "to": "copy"}];
VISUALS["em-kab"] = { t: "Teen sawaal: kaunsa business kaam hua, kisi field ka apna workflow hai, aur consumer ki zaroorat kisi aur event mein pehle se hai?", html: SD.viz.svg(HERO, EDGES, { nodes: { kaam: {tone:'acc',badge:'ek kaam ek event'}, flow: {tone:'acc',badge:'apna event'}, copy: {tone:'acc',badge:'apni copy'} } }, {w:890,h:215}) };
SD.registerLevels('sdd-eda', [
{
  "id": "em-kab",
  "icon": "⚖️",
  "group": "🧩 Event Modeling",
  "title": "Modeling 4 · Kab — kaunsa badlaav, kaisa event?",
  "badge": "Ghatna Pandit",
  "objectives": [
    "Kab ek kaam ka ek event, kab field ka apna event?",
    "Kab consumer apni copy banaye, producer na badle?",
    "Naya event publish karne se pehle kaunse sawaal poochho?"
  ],
  "lesson": [
    "<h3>⚖️ Har badlaav ki apni chitthi?</h3><p>Ghar ka pata ek chitthi mein, email ki apni chitthi kyunki naye email ka verification hota hai, aur loyalty wale apni diary khud rakhte hain.</p><p>Neeche har situation ko sahi dibbe mein daalo, phir design review ke chaar sawaal dekho.</p>"
  ],
  "stages": [
    {
      "type": "bins",
      "title": "⚖️ Is badlaav ka event kaisa ho?",
      "instructions": "Consumer ko existing events se apni copy chahiye toh 🧮 chuno. Kisi ek field se alag workflow shuru hota hai toh ✉️ chuno. Baaki business ghatna ke liye 📛 chuno. Field ka apna event bhi business event hai — is game mein zyada specific dibba chuno.",
      "bins": [
        {
          "id": "intent",
          "label": "📛 Kaam ke naam ka event"
        },
        {
          "id": "own",
          "label": "✉️ Field ka apna event"
        },
        {
          "id": "copy",
          "label": "🧮 Consumer apni copy banaye"
        }
      ],
      "items": [
        {
          "text": "Checkout par delivery address badla: flat, street, city, pin ek saath",
          "bin": "intent",
          "explain": "Ek kaam, ek event: AddressChanged mein poora naya pata. Field-field ke events beech mein aadha pata dikhate."
        },
        {
          "text": "User ne email badla; naye email par verification link jaana hai",
          "bin": "own",
          "explain": "Email badalne ka apna workflow hai — EmailChangeRequested, taaki verifier sirf EmailChangeRequested par jaage."
        },
        {
          "text": "Loyalty ko har PaymentCaptured par customerId chahiye; OrderPlaced mein pehle se hai",
          "bin": "copy",
          "explain": "Loyalty OrderPlaced se apni order → customer copy rakhe; payment team ko nahi badalna. Pehle aaye payments park karo."
        },
        {
          "text": "Bank ka din: ATM se paise nikle, card fee kati, fee wapas hui",
          "bin": "intent",
          "explain": "Har ghatna ka naam: CashWithdrawn, FeeCharged, FeeReversed — BalanceUpdated nahi. Fraud aur audit ko wajah chahiye."
        },
        {
          "text": "User ne password badla; baaki saare devices se logout karna hai",
          "bin": "own",
          "explain": "Password badalna security ka alag workflow shuru karta hai — PasswordChanged apna event."
        },
        {
          "text": "Analytics ko OrderShipped par customer ka latest home city chahiye; customer events mein customerId aur city milte hain",
          "bin": "copy",
          "explain": "Analytics customer events se home city ki apni copy rakhe aur customerId se jode. Shipment ke waqt ka destination city alag fact hai, jo shipment event mein ho sakta hai."
        },
        {
          "text": "Seller ne ek sale ke liye price aur discount saath badle",
          "bin": "intent",
          "explain": "Ek faisla, ek event (jaise PricingChanged mein dono). Alag events mein beech ka pal galat daam dikha sakta hai."
        },
        {
          "text": "Search index ko har profile ki poori nayi copy chahiye; koi workflow nahi",
          "bin": "copy",
          "explain": "Index profile events se apni copy banaye. Sirf copy rakhne wale consumer ke liye poori haalat wala event bhi chal jaata hai."
        }
      ]
    },
    {
      "type": "cards",
      "title": "📝 Event ka design review — chaar sawaal",
      "goal": "Naya event publish karne se pehle chaar sawaal poochho. Har sawaal ek galti pakadta hai.",
      "lesson": "Naam ghatna ka, kaat business ke kaam par, data us fact ka jo poora ho par consumer-specific na ho, aur roop badalna add-first. Metadata mein event ka context rakho — id, source, waqt, tracing, ya customer se jodne ki pehchaan; par metadata mein field rakhne se producer ka kaam ya bytes ka kharcha nahi jaata.",
      "steps": [
        {
          "title": "1. Naam",
          "say": "Beete kaal mein business ki ghatna: <b>CashWithdrawn</b>, <b>AddressChanged</b>. \"Updated\" ya \"Changed\" ke peeche ka asli kaam dhoondho — OrderUpdated se kuch pata nahi chalta."
        },
        {
          "title": "2. Kaat",
          "say": "Ek business kaam ke saare field ek event mein. Apne workflow wale field (email verification, password) ka alag event."
        },
        {
          "title": "3. Data",
          "say": "Event mein us fact ki poori baat ho, taaki consumer ko owner ko call na karna pade (clickbait nahi). Par kisi ek consumer ki zaroorat ke liye har event mein field mat jodo — consumer apni copy banaye.",
          "ask": {
            "q": "Order service ka event OrderPlaced { orderId }. Kitchen, billing aur delivery, teeno har event par order service ko call karte hain. Pehla sudhaar?",
            "choices": [
              "OrderPlaced mein order ka poora fact daalo (items, total, address); teeno ki call bachegi",
              "Order service ko bada server de do, taaki teeno consumers ki calls aaram se sambhal sake",
              "Teeno consumers ek shared cache se padhein, aur cache har ghante order service se bhare"
            ],
            "answer": 0,
            "hint": "Teen consumers, har event par ek call — calls kaise badhti hain?",
            "explain": "OrderPlaced { orderId } clickbait event hai: order banne ki khabar hai, par kitchen, billing aur delivery ke kaam ka data nahi. Calls = events × consumers (lab 47: 4 × 3 = 12). Order ke fact ki poori baat event mein ho toh calls 0 — par sirf us order ka fact, kisi consumer ki khaas zaroorat nahi.",
            "choiceExplanations": [
              "OrderPlaced { orderId } clickbait event hai: order banne ki khabar hai, par kitchen, billing aur delivery ke kaam ka data nahi. Calls = events × consumers (lab 47: 4 × 3 = 12). Order ke fact ki poori baat event mein ho toh calls 0 — par sirf us order ka fact, kisi consumer ki khaas zaroorat nahi.",
              "Bada server calls ko sehta hai, ghataata nahi; order service down toh teeno atkenge.",
              "Ghante bhar purana cache naye order ki jaankari nahi rakhega — order abhi bana hai."
            ]
          }
        },
        {
          "title": "4. Roop badalna",
          "say": "Naya field jodo (tolerant readers ke liye safe). Naam badalna ya hatana ho toh pehle strict readers ko taiyaar karo, phir dono field bhejo (expand), sab naye par aayein, tab purana hatao (contract). Version envelope ya type ke naam mein; publish se pehle registry compatibility jaanche."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Ek din, do roop — har event aur consumer ka jawab",
      "project": "51-event-modeling",
      "exercise": "ex2-facts",
      "goal": "Ravi ke khaate ka ek din: pehle BalanceUpdated (naya aur pichhla balance), phir ghatna ke naam ke events. Har event aur teen consumers ke jawab.",
      "why": "Node 22+ chahiye. Ek process, tay data — teeno runs byte-identical.",
      "steps": [
        {
          "text": "Lab folder se: state roop, har event.",
          "cmd": "cd docker-labs/51-event-modeling && npm start -- ex2-facts state --trace",
          "expect": "mode=state\n  1. BalanceUpdated   {\"balance\":15000,\"previous\":10000}\n  2. BalanceUpdated   {\"balance\":12500,\"previous\":15000}\n  3. BalanceUpdated   {\"balance\":12000,\"previous\":12500}\n  4. BalanceUpdated   {\"balance\":9000,\"previous\":12000}\n  5. BalanceUpdated   {\"balance\":9500,\"previous\":9000}\n  6. BalanceUpdated   {\"balance\":7300,\"previous\":9500}\n  7. BalanceUpdated   {\"balance\":7340,\"previous\":7300}\nstate  events=7 ATM>2000=3 (sahi 2) · fee-net=pata nahi (sahi 0) · ₹500 kyun: pata nahi (sirf 12500 → 12000)"
        },
        {
          "text": "Facts roop, har event.",
          "cmd": "npm start -- ex2-facts facts --trace",
          "expect": "mode=facts\n  1. SalaryCredited   {\"amount\":5000}\n  2. CashWithdrawn    {\"amount\":2500,\"atm\":\"ATM-17\"}\n  3. FeeCharged       {\"amount\":500,\"reason\":\"card annual fee\"}\n  4. CashWithdrawn    {\"amount\":3000,\"atm\":\"ATM-04\"}\n  5. FeeReversed      {\"amount\":500,\"reason\":\"card annual fee\"}\n  6. UpiPaid          {\"amount\":2200,\"to\":\"kirana\"}\n  7. InterestCredited {\"amount\":40}\nfacts  events=7 ATM>2000=2 (sahi 2) · fee-net=0 (sahi 0) · ₹500 kyun: FeeCharged (card annual fee)"
        }
      ],
      "observe": {
        "q": "State roop mein \"fee-net = pata nahi\". BalanceUpdated mein kya jodne se fee ka sawaal hal hota?",
        "choices": [
          "Har event ka business type — FeeCharged aur FeeReversed, charge se wapsi ghatao",
          "Teen-chaar pichhle balance aur — zyada itihaas se fee apne aap pehchaani jaayegi",
          "Har event par sahi timestamp — waqt dekh ke fee aur baaki debit alag ho jaayenge"
        ],
        "answer": 0,
        "hint": "Fee lagi aur fee wapas hui — dono ko kaise pehchaanoge?",
        "explain": "Fee-net ke liye charge aur wapsi, dono ka type chahiye. FeeCharged ₹500 aur FeeReversed ₹500 pehchaanne par net 500 − 500 = 0. Sirf debit ki wajah batana kaafi nahi. Business type jodte hi BalanceUpdated asal mein ghatna ka naam ban jaata hai.",
        "choiceExplanations": [
          "Fee-net ke liye charge aur wapsi, dono ka type chahiye. FeeCharged ₹500 aur FeeReversed ₹500 pehchaanne par net 500 − 500 = 0. Sirf debit ki wajah batana kaafi nahi. Business type jodte hi BalanceUpdated asal mein ghatna ka naam ban jaata hai.",
          "Zyada balances se zyada deltas milte hain, wajah phir bhi nahi. ₹500 ka har debit ek jaisa dikhta hai.",
          "Fee aur ATM ek hi second mein bhi ho sakte hain. Waqt wajah nahi batata."
        ]
      },
      "lesson": "Haalat ka event consumer ko andaaze par chhodta hai; ghatna ka event wajah saath laata hai. Pichhla balance, timestamp ya itihaas jodne se wajah nahi aati."
    }
  ],
  "interview": {
    "title": "Interview Round — design review",
    "instructions": "Pehle socho: kaunsa business kaam hua, aur kaun-kaun is event par kaam karta hai? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Startup ke saare events ke naam \"…Updated\" hain: OrderUpdated, UserUpdated, PaymentUpdated — har ek mein poori nayi haalat. Ab fraud aur email teams shikaayat karti hain. Review mein pehla sawaal?",
        "choices": [
          "Har Updated ke peeche kaunsa business kaam tha — event ka naam aur kaat business ke kaam par rakho",
          "Kya har Updated event mein pichhli haalat bhi hai — dono haalat ho toh consumer farq nikaal lega",
          "Kya events Kafka par hain — Kafka par ho toh consumers apne aap sahi events chun lenge",
          "Kya har event mein timestamp hai — waqt ho toh consumers kram se kaam samajh lenge"
        ],
        "answer": 0,
        "explain": "Fraud ko CashWithdrawn chahiye, email team ko EmailChangeRequested — Updated ke naam se dono ko har event khol ke andaaza lagana padta hai. Lab: generic event par verifier 3 baar jaaga (kaam ka 1); BalanceUpdated par fraud ne 3 gine (sahi 2), pichhla balance saath hote hue bhi.",
        "choiceExplanations": [
          "Fraud ko CashWithdrawn chahiye, email team ko EmailChangeRequested — Updated ke naam se dono ko har event khol ke andaaza lagana padta hai. Lab: generic event par verifier 3 baar jaaga (kaam ka 1); BalanceUpdated par fraud ne 3 gine (sahi 2), pichhla balance saath hote hue bhi.",
          "Lab ke state roop mein pichhla balance tha — phir bhi fee aur ATM alag nahi hue.",
          "Broker event ka naam ya data nahi badalta; design producer ka faisla hai.",
          "Waqt kram batata hai, wajah nahi. ₹500 ka debit kis cheez ka tha, timestamp nahi batata."
        ]
      },
      {
        "q": "Kab kisi ek field ka alag event (jaise EmailChangeRequested) banana theek hai?",
        "choices": [
          "Jab us field ke badalne se apna kaam shuru hota hai — verification, security alert, approval",
          "Jab bhi field user ke form mein alag box mein dikhta ho — har box ka apna event",
          "Kabhi nahi — ek save ka hamesha ek hi event hona chahiye, chahe kuch bhi badle",
          "Jab field bada ho, jaise photo — chhote fields ek event mein, bade alag events mein"
        ],
        "answer": 0,
        "explain": "Kaat ka niyam business ka kaam hai. Email badalna verification shuru karta hai, isliye apna event; ghar badalna ek kaam, toh street-city-pin ek event mein. Dudycz: \"sometimes it makes sense to create field change events\".",
        "choiceExplanations": [
          "Kaat ka niyam business ka kaam hai. Email badalna verification shuru karta hai, isliye apna event; ghar badalna ek kaam, toh street-city-pin ek event mein. Dudycz: \"sometimes it makes sense to create field change events\".",
          "Form ke box UI ka faisla hain, business ka nahi — street, city, pin teen box, par ek kaam.",
          "Ek save mein do kaam ho sakte hain (ghar aur email); ek event mein dono ko milana verifier ko har save par jagata hai.",
          "Size kaat ka niyam nahi. Badi photo bhi PhotoChanged ka ek fact hai."
        ]
      }
    ]
  },
  "success": [
    "Kis badlaav ka kaisa event ho, chun sakte ho",
    "Consumer ki copy kab behtar hai, bata sakte ho",
    "Naye event ka design review chaar sawaalon se kar sakte ho"
  ],
  "cards": [
    {
      "front": "Event ka naam kaisa?",
      "back": "Beete kaal mein business ki ghatna: CashWithdrawn, AddressChanged. OrderUpdated jaise naam se kaam ka pata nahi chalta."
    },
    {
      "front": "Field ka alag event kab?",
      "back": "Jab us field ke badlne se apna workflow shuru ho: email verification, password par logout."
    },
    {
      "front": "Ek consumer ko naya field chahiye — pehla vichaar?",
      "back": "Pehle dekho jaankari kisi existing event mein milti hai ya nahi. Milti ho toh consumer read model banaye — kram aur jaldi aaye events sambhaale. Milti hi nahi toh producer ka contract badalna pad sakta hai."
    }
  ]
}
]);
})();
