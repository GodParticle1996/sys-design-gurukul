/* Playlist · EDA Core topic 6: Event modeling. Source credit: Software Developer Diaries,
   "4 Event-Modeling Mistakes in Event-Driven Architectures" (m3mY3Ra-BcI); anti-patterns from Oskar Dudycz.
   Numbers: docker-labs/51-event-modeling/captures. */
(function () {
const HERO = [{"id": "te", "icon": "📛", "label": "toEvents()", "x": 140, "y": 105}, {"id": "an", "icon": "📒", "label": "answer()", "x": 445, "y": 105}, {"id": "pa", "icon": "🌿", "label": "parse()", "x": 750, "y": 105}];
const EDGES = [{"from": "te", "to": "an"}, {"from": "an", "to": "pa"}];
VISUALS["em-code"] = { t: "Teen functions: toEvents events kaatata hai, answer consumer ke sawaal ka jawab deta hai, parse naya ya gayab field sambhaalta hai.", html: SD.viz.svg(HERO, EDGES, { nodes: { te: {tone:'acc',badge:'kahan kaatein'}, an: {tone:'acc',badge:'wajah ya delta'}, pa: {tone:'acc',badge:'strict / tolerant'} } }, {w:890,h:215}) };
SD.registerLevels('sdd-eda', [
{
  "id": "em-code",
  "icon": "💻",
  "group": "🧩 Event Modeling",
  "title": "Modeling 3 · Code — events banana, ghatna padhna, roop sambhaalna",
  "badge": "Ghatna Kaarigar",
  "objectives": [
    "Ek save se field, generic aur intent events code mein kaise bante hain?",
    "State roop ka consumer kis line par galat ginta hai?",
    "Strict aur tolerant parser ka farq kis line mein hai?"
  ],
  "lesson": [
    "<h3>💻 Teen functions</h3><p>Lab 51 ka design teen functions mein dikhta hai: <b>toEvents</b> (save se events), <b>answer</b> (consumer ke sawaal) aur <b>parse</b> (event padhna).</p><p>Har function mein ek line hai jo design ki galti ko bug bana deti hai. Code khol ke dekho.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "📛 toEvents(): ek save, teen design",
      "goal": "lib/profile.js. Ravi ka save: changes = { street, city, pin, email }. Teeno mode is ek function se nikalte hain.",
      "code": {
        "title": "lib/profile.js",
        "file": "docker-labs/51-event-modeling/lib/profile.js",
        "from": 8,
        "text": "function toEvents(mode, user, changes) {\n  const keys = Object.keys(changes);\n  if (mode === 'field') return keys.map(k => ({ type: NAMES[k], user, data: { [k]: changes[k] } }));\n  if (mode === 'generic') return [{ type: 'ProfileUpdated', user, data: { changes } }];\n  const out = [];\n  if (keys.some(k => ADDRESS.includes(k))) {\n    if (!ADDRESS.every(k => k in changes)) throw Error('ghar badla = poora naya address chahiye (street, city, pin)');\n    out.push({ type: 'AddressChanged', user, data: Object.fromEntries(ADDRESS.map(k => [k, changes[k]])) });\n  }\n  if ('email' in changes) out.push({ type: 'EmailChangeRequested', user, data: { email: changes.email } });\n  if ('name' in changes) out.push({ type: 'NameChanged', user, data: { name: changes.name } });\n  if ('photo' in changes) out.push({ type: 'PhotoChanged', user, data: { photo: changes.photo } });\n  return out;\n}"
      },
      "vars": [
        {
          "id": "mode",
          "label": "mode"
        },
        {
          "id": "out",
          "label": "Bane events"
        }
      ],
      "steps": [
        {
          "title": "1. field",
          "say": "Line 10: har key ka apna event — StreetChanged, CityChanged, PinChanged, EmailChanged. Chaar events, har ek mein ek field.",
          "line": "10",
          "vars": {
            "mode": "field",
            "out": "4 events, har ek mein 1 field"
          }
        },
        {
          "title": "2. generic",
          "say": "Line 11: ek ProfileUpdated { changes } — jo bhi badla, sab ek event mein. Naam se nahi pata kya badla.",
          "line": "11",
          "vars": {
            "mode": "generic",
            "out": "1 ProfileUpdated"
          }
        },
        {
          "title": "3. intent: ghar",
          "say": "Lines 13–15: koi bhi address field badla toh AddressChanged — teeno field ek saath (line 15).",
          "line": "13-15",
          "vars": {
            "mode": "intent",
            "out": "AddressChanged"
          }
        },
        {
          "title": "4. Aadha address?",
          "say": "Line 14 ek shart lagati hai: address ka koi field badla ho toh teeno hone chahiye.",
          "line": "14",
          "vars": {
            "mode": "intent",
            "out": "?"
          },
          "ask": {
            "q": "Form sirf { pin: '560002' } bheje. Line 14 kya karegi, aur kyun?",
            "choices": [
              "Error phenkegi — AddressChanged mein street aur city khaali jaate, aur label service ki copy mit jaati",
              "Sirf pin ke saath AddressChanged bana degi — consumer purani street aur city khud rakh lenge",
              "Shart chhod ke PinChanged bana degi, kyunki intent mode mein bhi field events chalte hain"
            ],
            "answer": 0,
            "hint": "Label service AddressChanged par Object.assign(addr, e.data) chalati hai. Khaali value wali key ka kya hoga?",
            "explain": "Line 15 teeno field ka event banati; street aur city ki keys hoti, par value nahi (khaali). Label service (profile.js line 29, is pane ke bahar) Object.assign(addr, e.data) se poora data lagati hai — copy mein street aur city khaali ho jaate. Ghar badalna ek poora fact hai: event mein poora naya pata. Lab ka test yahi jaanchta hai.",
            "choiceExplanations": [
              "Line 15 teeno field ka event banati; street aur city ki keys hoti, par value nahi (khaali). Label service (profile.js line 29, is pane ke bahar) Object.assign(addr, e.data) se poora data lagati hai — copy mein street aur city khaali ho jaate. Ghar badalna ek poora fact hai: event mein poora naya pata. Lab ka test yahi jaanchta hai.",
              "Object.assign khaali value wali key bhi likh deta hai. Purani street apne aap nahi bachti.",
              "Intent mode mein PinChanged banane wali koi line nahi. Line 14 seedha error deti hai."
            ]
          }
        },
        {
          "title": "5. intent: email",
          "say": "Line 17: email badla toh alag EmailChangeRequested — verification ka apna kaam. Line 20: [AddressChanged, EmailChangeRequested].",
          "line": "17-20",
          "vars": {
            "mode": "intent",
            "out": "AddressChanged, EmailChangeRequested"
          }
        }
      ],
      "lesson": "Teeno design ek hi save se bante hain; farq sirf kaatne ki jagah ka hai. Intent mode business ka niyam code mein rakhta hai: ghar badla toh poora pata (line 14), aur email ka apna event (line 17)."
    },
    {
      "type": "dryrun",
      "title": "📒 answer(): balance ka badlaav vs ghatna",
      "goal": "lib/account.js. Ek din ke 7 events. Fraud ka sawaal: ₹2,000 se bade ATM withdrawals (sahi 2). Pehle state roop (BalanceUpdated), phir facts.",
      "code": {
        "title": "lib/account.js",
        "file": "docker-labs/51-event-modeling/lib/account.js",
        "from": 20,
        "text": "/* Teen consumers ke sawaal. state events par sirf balance ka badlaav (delta) dikhta hai. */\nfunction answer(events) {\n  if (events[0].type === 'BalanceUpdated') {\n    const deltas = events.map(e => e.data.balance - e.data.previous);\n    return { atmOver2000: deltas.filter(d => d < -2000).length,        // bada debit = ATM maan liya\n             feeNet: null,                                             // fee aur baaki debit mein farq nahi\n             why500: `pata nahi (sirf ${events[2].data.previous} → ${events[2].data.balance})` };\n  }\n  const sum = t => events.filter(e => e.type === t).reduce((a, e) => a + e.data.amount, 0);\n  return { atmOver2000: events.filter(e => e.type === 'CashWithdrawn' && e.data.amount > 2000).length,\n           feeNet: sum('FeeCharged') - sum('FeeReversed'),\n           why500: `${events[2].type} (${events[2].data.reason})` };\n}"
      },
      "vars": [
        {
          "id": "seen",
          "label": "Consumer ko dikha"
        },
        {
          "id": "atm",
          "label": "ATM > 2000"
        },
        {
          "id": "fee",
          "label": "Fee net"
        }
      ],
      "steps": [
        {
          "title": "1. State roop",
          "say": "Line 22: pehla event BalanceUpdated hai, toh state ka raasta. Line 23: har event ka badlaav — +5000, −2500, −500, −3000, +500, −2200, +40.",
          "line": "22-23",
          "vars": {
            "seen": "+5000 −2500 −500 −3000 +500 −2200 +40",
            "atm": "—",
            "fee": "—"
          }
        },
        {
          "title": "2. Fraud ki ginti",
          "say": "Line 24: −2,000 se chhota har badlaav ATM maan liya.",
          "line": "24",
          "vars": {
            "seen": "−2500, −3000, −2200",
            "atm": "?",
            "fee": "—"
          },
          "ask": {
            "q": "Line 24 kitne ginegi, aur kaunsa galat hai?",
            "choices": [
              "3 — ₹2,200 ka UPI bhi bada debit hai, toh ATM gin liya gaya",
              "2 — previous balance se line 24 ko pata chal jaata hai ki ATM kaunsa tha",
              "1 — line 24 sirf ₹3,000 jaisa sabse bada debit hi ATM maanti hai"
            ],
            "answer": 0,
            "hint": "Badlaav (delta) mein UPI aur ATM ka farq hai?",
            "explain": "Badlaav sirf number hai: −2,500, −3,000, −2,200 teeno −2,000 se chhote. Wajah event mein thi hi nahi. Lab: state roop mein 3 (sahi 2).",
            "choiceExplanations": [
              "Badlaav sirf number hai: −2,500, −3,000, −2,200 teeno −2,000 se chhote. Wajah event mein thi hi nahi. Lab: state roop mein 3 (sahi 2).",
              "previous se kitna kata, wahi nikalta hai; kis cheez se kata, nahi.",
              "Line 24 filter hai: −2,000 se chhota har badlaav gin leti hai."
            ]
          }
        },
        {
          "title": "3. Fee ka hisaab",
          "say": "Line 25: feeNet null — ₹500 ka debit fee bhi ho sakta hai aur kuch aur bhi. Line 26: audit ko bas 12,500 → 12,000 dikhta hai.",
          "line": "25-26",
          "vars": {
            "seen": "sirf numbers",
            "atm": "3 (sahi 2)",
            "fee": "pata nahi"
          }
        },
        {
          "title": "4. Facts roop",
          "say": "Line 29: sirf CashWithdrawn jinka amount 2,000 se zyada — 2. Line 30: FeeCharged (500) − FeeReversed (500) = 0. Line 31: teesra event FeeCharged (card annual fee).",
          "line": "29-31",
          "vars": {
            "seen": "SalaryCredited, CashWithdrawn, FeeCharged…",
            "atm": "2",
            "fee": "0"
          }
        }
      ],
      "lesson": "State roop ke consumer ko sirf badlaav milta hai, aur wajah ka andaaza lagana padta hai — fraud ne galat gina, fee report bani hi nahi. Ghatna ke naam ke events mein wajah pehle se hai; consumer sirf filter karta hai."
    },
    {
      "type": "dryrun",
      "title": "🌿 parse(): strict ya tolerant",
      "goal": "lib/reader.js. PaymentCaptured ke roop: v2 { orderId, amount, method }, v3 { orderId, total }, v4 { orderId, amount, total }.",
      "code": {
        "title": "lib/reader.js",
        "file": "docker-labs/51-event-modeling/lib/reader.js",
        "from": 5,
        "text": "function parse(mode, e) {\n  const d = (e && e.data) || {};\n  if (mode === 'strict') {\n    const extra = Object.keys(d).filter(k => !KNOWN.includes(k));\n    if (extra.length) return { ok: false, reason: `anjaana field ${extra.join(',')}` };\n  }\n  if (typeof d.orderId !== 'string') return { ok: false, reason: 'orderId nahi' };\n  if (!Number.isFinite(d.amount)) return { ok: false, reason: 'amount nahi' };\n  return { ok: true, orderId: d.orderId, amount: d.amount };\n}"
      },
      "vars": [
        {
          "id": "ev",
          "label": "Data"
        },
        {
          "id": "strict",
          "label": "strict"
        },
        {
          "id": "tol",
          "label": "tolerant"
        }
      ],
      "steps": [
        {
          "title": "1. strict, v2",
          "say": "Line 8: KNOWN (orderId, amount) ke bahar ke keys — method.",
          "line": "7-8",
          "vars": {
            "ev": "orderId, amount, method",
            "strict": "extra = [method]",
            "tol": "—"
          },
          "ask": {
            "q": "extra = ['method']. Strict consumer ka kya hoga?",
            "choices": [
              "Line 9 mana lautayegi — 'anjaana field method'; amount padha hi nahi jaayega",
              "Line 9 chhod degi kyunki method optional hai, aur line 13 tak padh jaayegi",
              "Line 11 tak jaayegi, kyunki strict sirf orderId ka type jaanchta hai"
            ],
            "answer": 0,
            "hint": "Line 9 kab chalti hai?",
            "explain": "extra.length 1 hai, toh line 9 seedha mana lautati hai. Lab v2: strict ne 100 / 100 mana kiye, sirf ek naye field ki wajah se.",
            "choiceExplanations": [
              "extra.length 1 hai, toh line 9 seedha mana lautati hai. Lab v2: strict ne 100 / 100 mana kiye, sirf ek naye field ki wajah se.",
              "Line 9 optional aur zaroori field mein farq nahi karti; extra mein kuch bhi ho toh mana.",
              "Line 9 return kar deti hai; line 11 tak strict pahunchta hi nahi."
            ]
          }
        },
        {
          "title": "2. tolerant, v2",
          "say": "Line 7 ki shart tolerant par nahi lagti. Line 11: orderId string hai; line 12: amount number hai; line 13: theek — method ko kisi ne dekha hi nahi.",
          "line": "11-13",
          "vars": {
            "ev": "orderId, amount, method",
            "strict": "mana",
            "tol": "theek"
          }
        },
        {
          "title": "3. tolerant, v3",
          "say": "v3 mein amount ki jagah total hai. Line 12: d.amount mein kuch nahi (khaali).",
          "line": "12",
          "vars": {
            "ev": "orderId, total",
            "strict": "mana (total anjaana)",
            "tol": "?"
          },
          "ask": {
            "q": "Line 12 par tolerant ka kya hoga?",
            "choices": [
              "Mana — 'amount nahi'; total chhod diya gaya, aur amount tha hi nahi",
              "Theek — tolerant total ko amount ki jagah padh leta hai",
              "Theek — Number.isFinite khaali amount par bhi true deta hai, toh aage badh jaata"
            ],
            "answer": 0,
            "hint": "Khaali amount par Number.isFinite kya deta hai?",
            "explain": "Khaali amount par Number.isFinite false deta hai, toh line 12 'amount nahi' lautati hai. Tolerant anjaana field chhodta hai — gayab field ka jugaad nahi karta. Lab v3: dono 100 mana.",
            "choiceExplanations": [
              "Khaali amount par Number.isFinite false deta hai, toh line 12 'amount nahi' lautati hai. Tolerant anjaana field chhodta hai — gayab field ka jugaad nahi karta. Lab v3: dono 100 mana.",
              "Code mein total padhne wali koi line nahi; field ka naam hi contract hai.",
              "Khaali amount par Number.isFinite false deta hai — isliye mana."
            ]
          }
        },
        {
          "title": "4. v4, dono field",
          "say": "v4: { orderId, amount, total }. Strict: line 8 mein extra = [total] → mana. Tolerant: amount hai → theek. Lab ka strict reader v4 bhi mana karta hai; expand se pehle strict reader ko dono field ke layak banana padta hai.",
          "line": "7-13",
          "vars": {
            "ev": "orderId, amount, total",
            "strict": "mana",
            "tol": "theek"
          }
        }
      ],
      "lesson": "Strict ki lines 8–9 har naye field ko breaking bana deti hain. Tolerant sirf apne zaroori field jaanchta hai (11–12): naya field chalta hai, gayab field nahi."
    },
    {
      "type": "cards",
      "title": "🔧 Apne system mein: lab se aage",
      "goal": "Lab mein events ka version, registry ya contract ka koi alag hissa nahi. Asli system mein ye sawaal bhi aate hain.",
      "lesson": "Version event ke saath likho, publish se pehle compatibility jaancho, strict validation sirf jahan zaroori ho, aur generic events sirf data copy karne wale consumers ke liye.",
      "steps": [
        {
          "title": "1. Version kahan likho?",
          "say": "Har event ke saath event ka version: envelope ke metadata mein ya type ke naam mein. Microsoft ka Event Sourcing pattern bhi yahi kehta hai: \"Include a version identifier in each event, either as metadata in the event envelope or as part of the event type name.\""
        },
        {
          "title": "2. Publish se pehle jaanch",
          "say": "Schema registry (jaise Confluent) naye schema ko purane se milata hai. Confluent: \"BACKWARD compatibility means that consumers using the new schema can read data produced with the last schema.\" Registry har naye schema ko format aur compatibility mode ke niyam se jaanchti hai. Purane reader ko naye events padhne hain toh FORWARD ki jaanch bhi samjho. Registry purane events nahi badalti.",
          "ask": {
            "q": "Avro schema se amount hata kar required total joda gaya. Total ka default nahi, aur amount ka alias nahi. Producer publish se pehle schema register karta hai; registry BACKWARD mode mein hai. Kya hoga?",
            "choices": [
              "Naya schema reject hoga — purane data mein total nahi, aur default ya alias bhi nahi",
              "Registry naam badal ke purane events ko bhi total wale roop mein likh degi",
              "Kuch nahi — registry sirf naye field jodne par jaanch karti hai, naam badalne par nahi"
            ],
            "answer": 0,
            "hint": "BACKWARD ka matlab kya hai: naya schema purana data padh sake?",
            "explain": "BACKWARD ki shart: naya schema purana data padh sake. Purane data mein total tha hi nahi, aur naye schema mein total ka default ya amount ka alias nahi — compatibility jaanch fail, register hi nahi hua. Producer registered schema se publish karta hai, toh badlaav publish se pehle ruk gaya. Default ya alias hota toh jawab badal sakta tha.",
            "choiceExplanations": [
              "BACKWARD ki shart: naya schema purana data padh sake. Purane data mein total tha hi nahi, aur naye schema mein total ka default ya amount ka alias nahi — compatibility jaanch fail, register hi nahi hua. Producer registered schema se publish karta hai, toh badlaav publish se pehle ruk gaya. Default ya alias hota toh jawab badal sakta tha.",
              "Registry schemas jaanchti hai, purane events nahi likhti. Events jaise the waise rehte hain.",
              "Registry har naye schema ko jaanchti hai, sirf naye field ko nahi. Kaunsa badlaav pass hoga, format aur mode tay karte hain."
            ]
          }
        },
        {
          "title": "3. Strict kahan theek?",
          "say": "Bahar se aane wala input (public API, partner ka file) — aise input par sakht jaanch theek. Andar ke events padhne wale consumer apne zaroori field jaanchein aur baaki chhodein — warna har naya field outage."
        },
        {
          "title": "4. Generic event kab chalega?",
          "say": "Jo consumer bas poori copy rakhta hai (search index, reporting DB) aur koi workflow nahi chalata, aise consumer ke liye poori nayi haalat wala event theek hai. Kaam shuru karne wale consumers (verification, fraud, shipping) ko ghatna ka naam chahiye."
        }
      ]
    }
  ],
  "interview": {
    "title": "Interview Round — code ki nazar se",
    "instructions": "Pehle socho: consumer kaunsa field padhta hai, aur naya ya gayab field aaye toh kya hoga? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Code review mein consumer ka parser: `const { orderId, amount, ...rest } = data; if (Object.keys(rest).length) throw Error('unknown')`. Producer team agle hafte ek naya optional field jodne wali hai. Kya hoga?",
        "choices": [
          "Naya field aate hi har event throw karega — sirf zaroori field jaancho, baaki chhodo",
          "Kuch nahi hoga — optional field consumer tak pahunchne se pehle broker hata deta hai",
          "Sirf pehla event throw karega; pehle event ke baad parser naya field yaad rakh ke chalega",
          "Throw sirf tab hoga jab naye field ki value null ho; asli value par parser theek chalega"
        ],
        "answer": 0,
        "explain": "rest mein naya field jaayega aur har event throw karega — lab ke strict consumer jaisa: v2 par 100 / 100 mana. Tolerant reader sirf orderId aur amount jaanchta hai; naya field chhod deta hai.",
        "choiceExplanations": [
          "rest mein naya field jaayega aur har event throw karega — lab ke strict consumer jaisa: v2 par 100 / 100 mana. Tolerant reader sirf orderId aur amount jaanchta hai; naya field chhod deta hai.",
          "Broker payload nahi badalta. Naya field consumer tak pahunchta hai.",
          "Parser ki koi yaad nahi; har event par wahi jaanch, har baar throw.",
          "Shart keys ki ginti par hai, value par nahi — null ho ya asli, key toh hai."
        ]
      },
      {
        "q": "toEvents mein ek developer line 14 hata deta hai: \"user sirf pin badle toh bhi AddressChanged chala do\". Label service AddressChanged ko Object.assign se lagati hai. Kya bigdega?",
        "choices": [
          "Sirf pin wale save par street aur city khaali ho jaayenge — label service ki copy mit jaayegi",
          "Kuch nahi — Object.assign khaali values ko apne aap chhod deta hai, purane bache rahenge",
          "AddressChanged bus par jaayega hi nahi, kyunki teeno field na hon toh bus mana karta hai",
          "Sirf pin badlega; street aur city ke liye label service owner se poochh ke bharegi"
        ],
        "answer": 0,
        "explain": "Line 15 teeno field likhti hai; sirf pin badla toh street aur city khaali. Object.assign khaali value bhi likh deta hai, toh label service ki copy mein street aur city mit jaate hain. Ghar badalna ek poora fact hai — event mein poora pata hona chahiye.",
        "choiceExplanations": [
          "Line 15 teeno field likhti hai; sirf pin badla toh street aur city khaali. Object.assign khaali value bhi likh deta hai, toh label service ki copy mein street aur city mit jaate hain. Ghar badalna ek poora fact hai — event mein poora pata hona chahiye.",
          "Object.assign mein khaali value bhi copy hoti hai; key maujood ho toh value badal jaati hai.",
          "Lab ka bus producer ka event seedha aage bhejta hai; event ki shakal nahi jaanchta.",
          "Lab ki label service owner ko call nahi karti; AddressChanged ka data Object.assign se apni copy mein lagati hai."
        ]
      }
    ]
  },
  "success": [
    "Ek save se teen tarah ke events code mein dikha sakte ho",
    "State roop ke consumer ki galti line par dikha sakte ho",
    "Strict aur tolerant parser ka farq samjha sakte ho"
  ],
  "cards": [
    {
      "front": "Strict parser ka khatra?",
      "back": "Har naya field breaking ban jaata hai. Lab v2: strict ne 100 / 100 mana kiye."
    },
    {
      "front": "Tolerant reader gayab field bachata hai?",
      "back": "Nahi. Naya field chhodta hai; amount gayab ho toh mana. Naam badalne ke liye expand / contract."
    },
    {
      "front": "Version kahan likho?",
      "back": "Envelope ke metadata mein ya type ke naam mein. Publish se pehle registry compatibility jaanche."
    }
  ]
}
]);
})();
