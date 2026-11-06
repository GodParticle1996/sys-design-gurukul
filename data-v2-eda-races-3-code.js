/* Playlist · EDA Core topic 4: EDA races. Source credit: Software Developer Diaries (skb6-JaBNQw).
   Numbers: docker-labs/49-eda-races/captures; source code byte-checked. */
(function () {
const HERO = [{"id": "broker", "icon": "📬", "label": "receive()", "x": 140, "y": 105}, {"id": "cas", "icon": "🔢", "label": "addCas()", "x": 445, "y": 105}, {"id": "charge", "icon": "🧾", "label": "charge()", "x": 750, "y": 105}];
const EDGES = [{"from": "broker", "to": "cas"}, {"from": "cas", "to": "charge"}];
VISUALS["er-code"] = { t: "Teen chhote functions: key aur lease, version ki shart, aur key + kaam ek transaction mein.", html: SD.viz.svg(HERO, EDGES, { nodes: { broker: {tone:'acc',badge:'key busy?'}, cas: {tone:'slow',badge:'version wahi?'}, charge: {tone:'ok',badge:'id pehle se?'} } }, {w:890,h:215}) };
SD.registerLevels('sdd-eda', [
{
  "id": "er-code",
  "icon": "💻",
  "group": "🏁 EDA Races",
  "title": "Races 3 · Code — lease, version ki shart aur key ka transaction",
  "badge": "Race Lohaar",
  "objectives": [
    "Broker kab message dobara deta hai, aur keyed mode kaise kram bachata hai?",
    "Compare-and-swap code mein khoya update kaise rokta hai?",
    "Idempotency key aur kaam ek transaction mein kyun?",
    "Asli system mein aur kya sochna hai?"
  ],
  "lesson": [
    "<h3>💻 Lab 49 ke teen chhote functions</h3><p>receive(), addCas() aur charge(). Chamakti line ko state ke saath padho — code panes mein asli lab files ki lines hain.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "📬 receive(): kaunsa message, kis shart par?",
      "goal": "lib/broker.js. Keyed mode. o1 ka #1 abhi A ke paas lease par (until = 1000). Waqt 5 ms. B line se maangta hai.",
      "code": {
        "title": "lib/broker.js",
        "file": "docker-labs/49-eda-races/lib/broker.js",
        "from": 13,
        "text": "    receive(now) {\n      const busy = new Set(items.filter(m => m.until > now).map(m => m.key));\n      const m = items.find(x => x.until <= now && !(keyed && busy.has(x.key)));\n      if (!m) return null;\n      m.attempt++;\n      m.until = now + leaseMs;\n      return { id: m.id, key: m.key, body: m.body, attempt: m.attempt };"
      },
      "vars": [
        {
          "id": "busy",
          "label": "Busy keys"
        },
        {
          "id": "pick",
          "label": "Mila"
        },
        {
          "id": "attempt",
          "label": "attempt / until"
        }
      ],
      "steps": [
        {
          "title": "1. Kaunsi keys bahar hain?",
          "say": "Line 14: abhi lease par diye gaye messages (until > now) ki keys. #1 (o1) ki lease 1000 tak — o1 busy.",
          "line": "14",
          "vars": {
            "busy": "o1",
            "pick": "—",
            "attempt": "—"
          }
        },
        {
          "title": "2. Agla message dhoondo",
          "say": "Line 15: pehla message chuno: message ki lease khatam ho (ya mili hi na ho), aur keyed mode mein message ki key busy na ho.",
          "line": "15",
          "vars": {
            "busy": "o1",
            "pick": "—",
            "attempt": "—"
          },
          "ask": {
            "q": "Line mein o1 ka #2 hai (kabhi lease par nahi gaya). Keyed mode, o1 busy. Line 15 #2 dega?",
            "choices": [
              "Nahi — keyed true aur o1 busy, toh #2 chhod ke agla dhoondhega",
              "Haan — #2 ki apni lease kabhi lagi hi nahi, toh #2 taiyaar hai",
              "Haan — keyed mode sirf ack ke baad lagta hai, receive par nahi"
            ],
            "answer": 0,
            "hint": "keyed && busy.has(x.key) ka matlab?",
            "explain": "Line 15 mein do shartein: lease khatam ho, aur keyed mode mein key busy na ho. #2 ki pehli shart theek hai, par key o1 busy hai — toh #2 nahi milta. Is niyam se o1 ke events ek ke baad ek jaate hain.",
            "choiceExplanations": [
              "Line 15 mein do shartein: lease khatam ho, aur keyed mode mein key busy na ho. #2 ki pehli shart theek hai, par key o1 busy hai — toh #2 nahi milta. Is niyam se o1 ke events ek ke baad ek jaate hain.",
              "Lease wali shart theek hai, par keyed wali shart #2 ko rok deti hai.",
              "Keyed shart receive ke waqt hi lagti hai: line 15 ke andar."
            ]
          }
        },
        {
          "title": "3. Kuch nahi mila",
          "say": "Line 16: o1 ke alawa line mein kuch nahi, toh null. B khaali haath.",
          "line": "16",
          "vars": {
            "busy": "o1",
            "pick": "null",
            "attempt": "—"
          }
        },
        {
          "title": "4. Ab socho ack kabhi na aaye",
          "say": "Lines 17–18: jab message milta hai, attempt badhta hai aur lease lagti hai (now + leaseMs). Phantom wale run mein lease 300 ms: p1 ko 10 ms par mila, until = 310.",
          "line": "17-18",
          "vars": {
            "busy": "u1",
            "pick": "p1",
            "attempt": "1 / 310 ms"
          },
          "ask": {
            "q": "Consumer crash ho gaya, ack nahi aaya. 310 ms par koi receive() bulaye toh?",
            "choices": [
              "p1 dobara milega, attempt 2 — lease khatam (until ≤ now) ho chuki",
              "Kuch nahi milega — ek baar diya message broker dobara kabhi nahi deta",
              "p1 milega, par attempt 1 hi rahega, kyunki pichhla attempt poora nahi hua"
            ],
            "answer": 0,
            "hint": "Line 15 ki pehli shart aur line 17.",
            "explain": "310 ms par until ≤ now, toh line 15 p1 ko phir chun leti hai, aur line 17 attempt 2 kar deti hai. Ack na aaye toh dobara dena hi at-least-once delivery hai — duplicate ka intezaam consumer ko karna hai.",
            "choiceExplanations": [
              "310 ms par until ≤ now, toh line 15 p1 ko phir chun leti hai, aur line 17 attempt 2 kar deti hai. Ack na aaye toh dobara dena hi at-least-once delivery hai — duplicate ka intezaam consumer ko karna hai.",
              "Broker ack ka intezaar karta hai; ack na aaye toh lease ke baad dobara deta hai.",
              "Line 17 har receive par attempt badhata hai."
            ]
          }
        }
      ],
      "lesson": "receive() do baat jaanchta hai: lease khatam hui ya nahi (ack na aaye toh dobara dena), aur keyed mode mein key busy hai ya nahi (ek key ek waqt). Asli brokers mein lease ka kaam visibility timeout / requeue karte hain. Ek key ek waqt: Kafka mein key se partition; RabbitMQ mein key se alag queues, har queue par single active consumer. Seema: kaam lease se lamba chale toh broker message doosre worker ko de deta hai, par purana worker abhi bhi DB mein likh sakta hai — lease akeli DB write nahi rokti."
    },
    {
      "type": "dryrun",
      "title": "🔢 addCas(): version wahi ho tabhi likho",
      "goal": "lib/apply.js. Balance 1,050, version 5. Consumers A aur B dono +10 lagane aaye. Pehle A likhta hai.",
      "code": {
        "title": "lib/apply.js",
        "file": "docker-labs/49-eda-races/lib/apply.js",
        "from": 34,
        "text": "async function addCas(db, id, delta, gapMs) {          // ex2 fix: version wahi ho tabhi likho\n  for (let tries = 1; ; tries++) {\n    const { balance, version } = db.prepare('SELECT balance, version FROM account WHERE id = ?').get(id);\n    await sleep(gapMs);\n    const r = db.prepare('UPDATE account SET balance = ?, version = version + 1 WHERE id = ? AND version = ?')\n      .run(balance + delta, id, version);\n    if (r.changes === 1) return tries;\n  }"
      },
      "vars": [
        {
          "id": "db",
          "label": "DB (balance / version)"
        },
        {
          "id": "a",
          "label": "A ne padha"
        },
        {
          "id": "b",
          "label": "B ne padha"
        }
      ],
      "steps": [
        {
          "title": "1. Dono ne padha",
          "say": "Line 36: A aur B dono ne padha — balance 1,050, version 5.",
          "line": "36",
          "vars": {
            "db": "1050 / v5",
            "a": "1050 / v5",
            "b": "1050 / v5"
          }
        },
        {
          "title": "2. Beech ka gap",
          "say": "Line 37: 20 ms ka kaam (lab ki setting). Is gap mein doosra consumer likh sakta hai.",
          "line": "37",
          "vars": {
            "db": "1050 / v5",
            "a": "1050 / v5",
            "b": "1050 / v5"
          }
        },
        {
          "title": "3. A ne likha",
          "say": "Lines 38–39: A: balance = 1,060, version + 1, <b>WHERE version = 5</b>. DB mein version 5 tha — 1 row badli. DB: 1,060 / v6.",
          "line": "38-39",
          "vars": {
            "db": "1060 / v6",
            "a": "likh diya",
            "b": "1050 / v5"
          }
        },
        {
          "title": "4. B bhi likhne aaya",
          "say": "Lines 38–39 phir: B: balance = 1,060, <b>WHERE version = 5</b>. DB ab v6 par hai.",
          "line": "38-39",
          "vars": {
            "db": "1060 / v6",
            "a": "likh diya",
            "b": "1050 / v5"
          },
          "ask": {
            "q": "B ke UPDATE ka kya hoga?",
            "choices": [
              "0 rows badlengi — version 5 ab nahi; line 40 fail, loop dobara padhega",
              "1 row badlegi — balance 1,060 hi toh likhna hai, wahi value hai",
              "SQLite error dega aur B ka consumer crash ho jaayega"
            ],
            "answer": 0,
            "hint": "WHERE version = 5, aur DB mein version 6.",
            "explain": "Shart version = 5 ab kisi row par sach nahi, toh 0 rows badli. Line 40 ki jaanch fail, loop line 36 se dobara padhta hai: 1,060 / v6, aur phir 1,070 likhta hai. Bina is shart ke (addUnsafe) B ka 1,060 A ke 1,060 ke upar likh jaata — ek ₹10 gaya. Lab: 20 mein se 10.",
            "choiceExplanations": [
              "Shart version = 5 ab kisi row par sach nahi, toh 0 rows badli. Line 40 ki jaanch fail, loop line 36 se dobara padhta hai: 1,060 / v6, aur phir 1,070 likhta hai. Bina is shart ke (addUnsafe) B ka 1,060 A ke 1,060 ke upar likh jaata — ek ₹10 gaya. Lab: 20 mein se 10.",
              "Value same ho tab bhi shart version ki hai. v5 nahi mila, toh kuch nahi likha.",
              "0 rows badalna error nahi hai; code changes dekh ke dobara koshish karta hai."
            ]
          }
        },
        {
          "title": "5. Dobara padh ke likha",
          "say": "Loop: B ne 1,060 / v6 padha, 1,070 / v7 likha. Dono ₹10 bache. Koshishein: A 1, B 2 — lab mein 20 events par 39.",
          "line": "40",
          "vars": {
            "db": "1070 / v7",
            "a": "likh diya",
            "b": "1070 likh diya (koshish 2)"
          }
        }
      ],
      "lesson": "Compare-and-swap: likhte waqt jaancho ki padhne ke baad kisi ne badla toh nahi (WHERE version = ?). Badla ho toh 0 rows — dobara padho. Sirf jodna ho toh line 44 ka atomic update (balance = balance + ?) aur sasta hai: koi gap, koi dobara koshish nahi."
    },
    {
      "type": "dryrun",
      "title": "🧾 charge(): key aur kaam ek saath",
      "goal": "lib/apply.js. p1 (u1, ₹100) ki doosri delivery aayi; pehli delivery ne charge likha tha, ack se pehle crash. Mode paymentId.",
      "code": {
        "title": "lib/apply.js",
        "file": "docker-labs/49-eda-races/lib/apply.js",
        "from": 47,
        "text": "function charge(db, p, keyMode) {                      // ex3: payment, duplicate se bachav ke saath\n  const key = { none: null, userAmount: `${p.user}:${p.amount}`,\n    arrival: `${p.user}:${Date.now()}`, paymentId: p.id }[keyMode];\n  db.exec('BEGIN IMMEDIATE');\n  try {\n    if (key && db.prepare('INSERT OR IGNORE INTO processed VALUES (?)').run(key).changes === 0) {\n      db.exec('COMMIT');\n      return 'duplicate';\n    }\n    db.prepare('INSERT INTO charges (payment, user, amount) VALUES (?, ?, ?)').run(p.id, p.user, p.amount);\n    db.exec('COMMIT');\n    return 'charged';\n  } catch (err) { rollback(db); throw err; }            // SQL error: adhura kaam wapas, connection saaf\n}"
      },
      "vars": [
        {
          "id": "key",
          "label": "Key"
        },
        {
          "id": "processed",
          "label": "processed mein"
        },
        {
          "id": "charges",
          "label": "charges"
        }
      ],
      "steps": [
        {
          "title": "1. Key kis se bane?",
          "say": "Lines 48–49: mode paymentId: key = p1 (producer ki id). userAmount hota toh u1:100, arrival hota toh u1 + abhi ka waqt.",
          "line": "48-49",
          "vars": {
            "key": "p1",
            "processed": "p1",
            "charges": "p1"
          }
        },
        {
          "title": "2. Transaction shuru",
          "say": "Line 50: BEGIN IMMEDIATE — transaction shuru. Ab line 52 ki key aur line 56 ka charge, COMMIT tak ek hi transaction mein likhe jaayenge.",
          "line": "50",
          "vars": {
            "key": "p1",
            "processed": "p1",
            "charges": "p1"
          }
        },
        {
          "title": "3. Key daalo — pehle se hai?",
          "say": "Line 52: INSERT OR IGNORE processed ('p1'). p1 pehle se hai, toh changes = 0.",
          "line": "52",
          "vars": {
            "key": "p1",
            "processed": "p1",
            "charges": "p1"
          },
          "ask": {
            "q": "changes = 0. Ab aage kya chalega?",
            "choices": [
              "Lines 53–54: COMMIT aur 'duplicate' lautao — charge ki line 56 tak nahi pahunchte",
              "Line 56: charge likho — key pehle se thi, toh p1 pakka asli payment hai",
              "Line 52 dobara chalegi, jab tak changes = 1 na ho jaaye"
            ],
            "answer": 0,
            "hint": "if (key && … .changes === 0) ka andar kya hai?",
            "explain": "p1 ki key pehle se thi, toh p1 payment dobara aaya hai. Lines 53–54 commit karke 'duplicate' lautati hain; consumer bas ack karta hai. Charge sirf ek baar.",
            "choiceExplanations": [
              "p1 ki key pehle se thi, toh p1 payment dobara aaya hai. Lines 53–54 commit karke 'duplicate' lautati hain; consumer bas ack karta hai. Charge sirf ek baar.",
              "Key pehle se hona hi duplicate ka saboot hai — naya charge galat hoga.",
              "INSERT OR IGNORE ek baar chalta hai; dobara chalane se kuch nahi badlega."
            ]
          }
        },
        {
          "title": "4. Pehli delivery par kya hua tha?",
          "say": "Pehli baar key nahi thi: line 52 ne p1 joda (changes = 1), line 56 ne charge likha, line 57 ne dono ek saath commit kiye. Phir ack se pehle crash.",
          "line": "56-57",
          "vars": {
            "key": "p1",
            "processed": "p1",
            "charges": "p1"
          },
          "ask": {
            "q": "Socho crash line 56 ke baad par line 57 (COMMIT) se pehle hota. Dobara delivery par kya hota?",
            "choices": [
              "Ek charge — transaction commit nahi hua, toh key aur charge dono nahi likhe gaye the",
              "Do charge — charge line 56 par likh chuka tha, key ka koi asar nahi",
              "Zero charge — key likhi ja chuki thi, toh dobara delivery duplicate maani jaati"
            ],
            "answer": 0,
            "hint": "COMMIT ke bina transaction ka kya hota hai?",
            "explain": "BEGIN IMMEDIATE se COMMIT tak sab ek saath hai. COMMIT se pehle crash = kuch bhi pakka nahi likha — na key, na charge. Dobara delivery par sab pehli baar jaisa: ek charge. Isliye key aur kaam ek hi transaction mein.",
            "choiceExplanations": [
              "BEGIN IMMEDIATE se COMMIT tak sab ek saath hai. COMMIT se pehle crash = kuch bhi pakka nahi likha — na key, na charge. Dobara delivery par sab pehli baar jaisa: ek charge. Isliye key aur kaam ek hi transaction mein.",
              "Bina COMMIT ke line 56 ka charge pakka nahi hota; transaction poora wapas ho jaata hai.",
              "Key bhi charge wale transaction mein thi — key bhi pakki nahi hui."
            ]
          }
        }
      ],
      "lesson": "Key producer ki stable id se, aur key + kaam ek hi transaction mein: ya dono, ya koi nahi. Commit ke baad crash ho toh key duplicate pakadti hai; commit se pehle crash ho toh kuch likha hi nahi gaya. Pehle SELECT, phir alag INSERT — do consumers ke beech ye jaanch race kar sakti hai. Line 59: SQL error aaye toh ROLLBACK, warna process zinda rehte hue connection adhura transaction pakde rehta hai."
    },
    {
      "type": "cards",
      "title": "🔧 Apne system mein: lab se aage",
      "goal": "Lab ka code chhota hai. Asli system mein ye sawaal bhi aate hain.",
      "lesson": "Processed keys kitni der rakhni hain, bahar ki service (payment gateway) ko bhi key bhejni hai, aur ek garam key ek consumer par atak sakti hai — teeno design mein socho.",
      "steps": [
        {
          "title": "1. Processed keys kab tak?",
          "say": "Key utni der rakho jitni der tak duplicate aa sakta hai: broker ki retention aur redelivery ka waqt. Jaldi mita di toh baad mein aaya duplicate naya lagega."
        },
        {
          "title": "2. Kaam bahar ki service mein ho toh?",
          "say": "Charge apne DB mein nahi, payment gateway par ho, toh gateway ki call aur apni DB ek transaction mein nahi aa sakte. Tab gateway ko bhi wahi payment id idempotency key ke roop mein bhejo — Stripe jaise gateways ye key lete hain.",
          "ask": {
            "q": "Consumer gateway ko charge karta hai, aur apni DB mein key likhne se pehle crash. Dobara delivery par dohra charge kaun rokega?",
            "choices": [
              "Gateway — agar har call par wahi payment id idempotency key bheji gayi",
              "Apni DB — key DB mein pehle se hai, toh gateway par dobara charge nahi hoga",
              "Broker — crash hua consumer ka message broker dobara nahi deta"
            ],
            "answer": 0,
            "hint": "Dobara delivery par gateway ki call phir jaayegi. Gateway ke paas kya hai?",
            "explain": "Key DB mein likhne se pehle crash hua, toh DB mein key nahi hai. Dobara delivery par gateway ki call phir jaayegi. Gateway wahi idempotency key dekh ke pehla nateeja lautaye, tabhi dohra charge rukta hai.",
            "choiceExplanations": [
              "Key DB mein likhne se pehle crash hua, toh DB mein key nahi hai. Dobara delivery par gateway ki call phir jaayegi. Gateway wahi idempotency key dekh ke pehla nateeja lautaye, tabhi dohra charge rukta hai.",
              "Crash key likhne se pehle hua, toh DB mein key hai hi nahi. Apni DB aur gateway ek transaction mein nahi aa sakte.",
              "Ack nahi mila toh broker dobara deta hai — at-least-once."
            ]
          }
        },
        {
          "title": "3. Garam key",
          "say": "Ek key ek consumer: kram bachta hai, par ek bahut busy key (jaise ek bada merchant) ka saara kaam ek hi consumer par. Busy key par line lambi hogi — key ka chunaav aisa ho ki load bikhre aur kram ki zaroorat bhi poori ho."
        }
      ]
    }
  ],
  "interview": {
    "title": "Interview Round — code ki nazar se",
    "instructions": "Code ki line socho, phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Consumer pehle SELECT se dekhta hai ki payment id processed mein hai ya nahi; nahi hai toh charge karta hai aur phir INSERT. Do consumers par kabhi-kabhi duplicate charge. Kyun?",
        "choices": [
          "Dono ne ek saath SELECT kiya, dono ko \"nahi hai\" mila — jaanch aur likhna alag the",
          "SELECT galat table padh raha tha, isliye duplicate kabhi pakda hi nahi gaya",
          "INSERT se pehle COMMIT nahi kiya, isliye pichhli key DB mein dikhi hi nahi",
          "Payment id har delivery par badalti hai, isliye SELECT ko key nahi mili"
        ],
        "answer": 0,
        "explain": "Jaanch (SELECT) aur likhna (INSERT) do alag kadam hain; beech mein doosra consumer wahi jaanch kar sakta hai. Ilaaj: unique constraint par INSERT (OR IGNORE / ON CONFLICT) ko hi jaanch banao, kaam ke saath ek transaction mein — lab ka charge() yahi karta hai.",
        "choiceExplanations": [
          "Jaanch (SELECT) aur likhna (INSERT) do alag kadam hain; beech mein doosra consumer wahi jaanch kar sakta hai. Ilaaj: unique constraint par INSERT (OR IGNORE / ON CONFLICT) ko hi jaanch banao, kaam ke saath ek transaction mein — lab ka charge() yahi karta hai.",
          "Table sahi ho tab bhi do consumers ek saath \"nahi hai\" padh sakte hain.",
          "COMMIT se pehle likha data doosre consumer ko nahi dikhta — par asli dikkat jaanch aur likhne ka alag hona hai.",
          "Payment id producer ki hai, redelivery par nahi badalti. Dikkat jaanch ka tareeka hai."
        ]
      },
      {
        "q": "Kafka consumer group mein order events ki key order id hai. Ek consumer slow ho gaya aur rebalance hua. Kya kram ki guarantee ab bhi hai?",
        "choices": [
          "Partition ka log kram mein rehta hai; DB writes ke liye purane owner ka kaam roko, kram mein process karo, dedupe bhi",
          "Nahi — rebalance hote hi Kafka saare partitions ka kram mila deta hai",
          "Haan, aur rebalance par koi event kabhi dobara nahi aata — Kafka exactly-once deta hai",
          "Kram sirf tab tak hai jab tak consumer group mein ek hi consumer ho"
        ],
        "answer": 0,
        "explain": "Kafka partition ke records kram mein padhta hai, aur same key same partition mein jaati hai. Par rebalance purane consumer ka pehle se shuru DB write apne aap cancel nahi karta. Partition chhodte waqt pending kaam ka intezaam karo, purane owner ya purane sequence ke writes roko, aur sirf poore hue kaam ke offsets commit karo. Dobara mile event ko stable id se dedupe karo — sirf dedupe se alag event ids ke ulte DB writes nahi rukte.",
        "choiceExplanations": [
          "Kafka partition ke records kram mein padhta hai, aur same key same partition mein jaati hai. Par rebalance purane consumer ka pehle se shuru DB write apne aap cancel nahi karta. Partition chhodte waqt pending kaam ka intezaam karo, purane owner ya purane sequence ke writes roko, aur sirf poore hue kaam ke offsets commit karo. Dobara mile event ko stable id se dedupe karo — sirf dedupe se alag event ids ke ulte DB writes nahi rukte.",
          "Rebalance log ka kram nahi milata; partition ka log kram mein rehta hai. Dikkat DB writes ke kram mein hai, log mein nahi.",
          "Default consumer at-least-once hai; commit se pehle wala kaam dobara aa sakta hai.",
          "Kai consumers ho tab bhi har partition ek consumer par — kram partition ke andar bachta hai."
        ]
      }
    ]
  },
  "success": [
    "Lease aur keyed shart code mein dikha sakte ho",
    "CAS ki WHERE version shart ka kaam samjha sakte ho",
    "Key + kaam ek transaction ka faayda aur check-then-insert ki race bata sakte ho"
  ],
  "cards": [
    {
      "front": "receive() ki do shartein?",
      "back": "Lease khatam (ack na aaye toh dobara), aur keyed mode mein key busy na ho (ek key ek waqt)."
    },
    {
      "front": "CAS mein 0 rows badli toh?",
      "back": "Padhne ke baad kisi ne badla. Dobara padho aur likho. Sirf jodna ho toh atomic update sasta."
    },
    {
      "front": "Key aur kaam ek transaction mein kyun?",
      "back": "Commit se pehle crash = kuch nahi likha; commit ke baad = key duplicate pakadti hai. Beech ki haalat nahi."
    }
  ]
}
]);
})();
