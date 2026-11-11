/* First Principles — FAANG Senior Engineer.
   Source credit: The Taxonomy of Storage (mhpinZnH7xI), numbered video 6/15.
   Evidence: docker-labs/56-storage-taxonomy/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "mv", "icon": "🏠", "label": "moveAddress()", "x": 150, "y": 105}, {"id": "rd", "icon": "📜", "label": "readers", "x": 445, "y": 105}, {"id": "mg", "icon": "🔁", "label": "migration", "x": 750, "y": 105}];
const EDGES = [{"from": "mv", "to": "rd"}, {"from": "rd", "to": "mg"}];
VISUALS["fp-tax-code"] = { t: "Do functions, do vaade: har copy badlegi, har customer gina jaayega.", html: SD.viz.svg(HERO, EDGES, { nodes: { mv: {tone:'acc',badge:'6 copies'}, rd: {tone:'bad',badge:'20%'}, mg: {tone:'ok',badge:'100%'} } }, {w:890,h:215}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-tax-code",
  "icon": "🗂️",
  "group": "🗂️ Taxonomy of Storage",
  "title": "Taxonomy 3 · Code — copies, transaction aur readers",
  "badge": "Schema Rakshak",
  "objectives": [
    "Copies badalte waqt crash ho toh code mein kya hota hai?",
    "Schema on read mein reader chupchaap galat kyun ginta hai?",
    "Migration ko dobara chalana safe kaise banate hain?"
  ],
  "lesson": [
    "<h3>💻 Do chhote functions, do bade vaade</h3><p>moveAddress() vaada karta hai: address har copy mein badlega. Schema readers vaada karte hain: har customer gina jaayega. Dono vaade tootte hain jab code ek kadam bhool jaaye — ek transaction, ya ek purana field.</p><p>Pehle code, phir review ke bugs.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "🏠 moveAddress(): chhe copies, ek crash",
      "goal": "lib/move.js. User 4242 ghar badalta hai. Lab ka business niyam: user ne pending deliveries ka destination bhi badalne ko kaha. Address user ke document aur 5 pending order documents (table: invoice_docs) mein copy hai. <code>crashAfter = 3</code> chauthe write se pehle crash karwata hai (lab mein crash ek phenka gaya error hai, asli process kill nahi).",
      "code": {
        "title": "lib/move.js",
        "file": "docker-labs/56-storage-taxonomy/lib/move.js",
        "from": 15,
        "text": "function moveAddress(db, id, addr, { crashAfter = -1, inTransaction = false } = {}) {\n  const pending = db.prepare('SELECT order_id FROM invoice_docs WHERE user_id = ? ORDER BY order_id').all(id);\n  const targets = [['user_docs', 'id', id], ...pending.map(r => ['invoice_docs', 'order_id', r.order_id])];\n  if (inTransaction) db.exec('BEGIN');\n  try {\n    targets.forEach(([table, key, rowId], i) => {\n      if (i === crashAfter) throw new Error('app crashed');\n      const d = JSON.parse(db.prepare(`SELECT doc FROM ${table} WHERE ${key} = ?`).get(rowId).doc);\n      if (table === 'user_docs') d.address = addr; else d.shipTo = addr;\n      db.prepare(`UPDATE ${table} SET doc = ? WHERE ${key} = ?`).run(JSON.stringify(d), rowId);\n    });\n    if (inTransaction) db.exec('COMMIT');\n    return { crashed: false };\n  } catch (e) {\n    if (inTransaction) db.exec('ROLLBACK');\n    if (e.message !== 'app crashed') throw e;\n    return { crashed: true };\n  }\n}"
      },
      "vars": [
        {
          "id": "done",
          "label": "Badle documents"
        },
        {
          "id": "tx",
          "label": "Transaction"
        },
        {
          "id": "state",
          "label": "Database mein"
        }
      ],
      "steps": [
        {
          "title": "1. Copies ki list",
          "say": "Line 16–17: <code>targets</code> = user ka document + har pending order document. Kul 6. App ko khud pata hona chahiye ki copies kahan hain — database ko nahi pata.",
          "line": "16-17",
          "vars": {
            "done": "0",
            "tx": "?",
            "state": "6 purane"
          }
        },
        {
          "title": "2. Bina transaction",
          "say": "<code>inTransaction = false</code>: line 18 kuch nahi karti. Line 20–24: har target padho, address badlo, wapas likho. Har UPDATE turant pakka.",
          "line": "18-24",
          "vars": {
            "done": "1, 2, 3",
            "tx": "nahi",
            "state": "3 naye, 3 purane"
          }
        },
        {
          "title": "3. Crash",
          "say": "Line 21: <code>i === 3</code> par error. Line 29 sirf transaction mein ROLLBACK karti hai; inTransaction=false wale run mein transaction nahi.",
          "line": "21-29",
          "vars": {
            "done": "3",
            "tx": "nahi",
            "state": "3 naye, 3 purane"
          },
          "ask": {
            "q": "Crash ke baad database mein kya bacha?",
            "choices": [
              "3 documents naye address ke saath, 3 purane — pehle ke 3 UPDATE pakke ho chuke the",
              "Sab purane — crash par database pichhle UPDATE apne aap wapas le leta hai",
              "Sab naye — line 24 ka UPDATE baaki 3 copies ko bhi saath badal deta hai"
            ],
            "answer": 0,
            "hint": "Bina BEGIN ke har UPDATE kab pakka hota hai?",
            "explain": "Bina BEGIN ke SQLite har UPDATE ko apna chhota transaction maanta hai: turant pakka. Crash ne sirf aage ke writes roke. Ab 3 naye, 3 purane — lab ex1: \"3 documents say the new 411004, 3 still say the old\".",
            "choiceExplanations": [
              "Bina BEGIN ke SQLite har UPDATE ko apna chhota transaction maanta hai: turant pakka. Crash ne sirf aage ke writes roke. Ab 3 naye, 3 purane — lab ex1: \"3 documents say the new 411004, 3 still say the old\".",
              "Wapas lene ke liye transaction chahiye; bina transaction pakke writes wapas nahi aate.",
              "Line 24 sirf ek row (ek target) badalti hai."
            ]
          }
        },
        {
          "title": "4. Transaction ke saath",
          "say": "<code>inTransaction = true</code>: line 18 <b>BEGIN</b>. Pehle 3 UPDATE chalte hain; chauthe write se pehle error aata hai. Line 29: <b>ROLLBACK</b>.",
          "line": "18-29",
          "vars": {
            "done": "0 (wapas)",
            "tx": "BEGIN … ROLLBACK",
            "state": "6 purane"
          },
          "ask": {
            "q": "ROLLBACK ke baad app ko kya karna chahiye?",
            "choices": [
              "Move dobara chalao — data purana par ek jaisa hai; is baar COMMIT tak pahunchna hai",
              "Kuch nahi — ROLLBACK ne naya address bhi likh diya, kaam poora ho gaya",
              "Sirf baaki 3 order documents badlo — pehle ke 3 transaction mein bache hain"
            ],
            "answer": 0,
            "hint": "ROLLBACK ke baad kitne documents mein naya address hai?",
            "explain": "ROLLBACK sab wapas leta hai: 0 badle. Data purana hai par ek jaisa — courier ko do address nahi milte. Move abhi bhi baaki hai, toh dobara chalao (lab ex1: \"no crash: 6 of 6 updated\").",
            "choiceExplanations": [
              "ROLLBACK sab wapas leta hai: 0 badle. Data purana hai par ek jaisa — courier ko do address nahi milte. Move abhi bhi baaki hai, toh dobara chalao (lab ex1: \"no crash: 6 of 6 updated\").",
              "ROLLBACK naya kuch nahi likhta; sirf transaction ke writes mitata hai.",
              "ROLLBACK ke baad pehle ke 3 writes bhi gaye; sirf baaki 3 badle toh phir mila-jula."
            ]
          }
        },
        {
          "title": "5. COMMIT",
          "say": "Bina crash: line 26 <b>COMMIT</b> — saare 6 ek saath pakke. Line 30: asli error ho (crash ke alawa) toh upar phenko, chhupao mat.",
          "line": "26-30",
          "vars": {
            "done": "6",
            "tx": "COMMIT",
            "state": "6 naye"
          }
        }
      ],
      "lesson": "Copies ho toh app ko har copy ki list chahiye. Bina transaction crash = mila-jula sach. BEGIN … COMMIT se sab ya kuch nahi; ROLLBACK ke baad kaam dobara chalao."
    },
    {
      "type": "dryrun",
      "title": "📜 Teen readers, ek migration",
      "goal": "lib/schema.js. 1 lakh customer documents teen app versions se: v1 <code>{zip}</code> 49,935, v2 <code>{postal_code}</code> 30,003, v3 <code>{address:{pin}}</code> 20,062. Sawaal: Pune (411xxx) mein kitne? Sach: 14,928.",
      "code": {
        "title": "lib/schema.js",
        "file": "docker-labs/56-storage-taxonomy/lib/schema.js",
        "from": 3,
        "text": "// Schema on write: a STRICT table whose rules refuse bad rows.\nconst CUSTOMERS = 'CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT NOT NULL, ' +\n  'pincode TEXT NOT NULL CHECK (length(pincode) = 6 ' +\n  \"AND pincode GLOB '[1-9][0-9][0-9][0-9][0-9][0-9]')) STRICT\";\n// Schema on read: three app versions wrote three shapes:\n//   v1 {zip}   v2 {postal_code}   v3 {address: {pin}}\nconst V3 = \"json_extract(doc, '$.address.pin')\";\nconst V2 = \"json_extract(doc, '$.postal_code')\";\nconst V1 = \"json_extract(doc, '$.zip')\";\nconst READERS = [\n  ['reader knows only v3', V3],\n  ['reader knows v2 + v3', `coalesce(${V3}, ${V2})`],\n  ['reader knows v1 + v2 + v3', `coalesce(${V3}, ${V2}, ${V1})`],\n];\n// Rewrite every v1/v2 document to the v3 shape.\n// v3 documents are left alone, so a second run changes nothing.\nconst MIGRATE = 'UPDATE customer_docs SET doc = json_set(' +\n  \"json_remove(doc, '$.zip', '$.postal_code'), '$.address', \" +\n  `json_object('pin', coalesce(${V2}, ${V1}), 'city', 'x'))` +\n  ` WHERE ${V3} IS NULL`;"
      },
      "vars": [
        {
          "id": "found",
          "label": "Mila"
        },
        {
          "id": "truth",
          "label": "Sach"
        },
        {
          "id": "err",
          "label": "Error?"
        }
      ],
      "steps": [
        {
          "title": "1. Table ke rules",
          "say": "Line 4–6: STRICT table, pincode <code>NOT NULL</code>, aur <code>CHECK</code>: theek 6 ank, pehla 0 nahi. <code>'4110'</code>, <code>null</code>, <code>'41100X'</code> — teeno database khud refuse karta hai.",
          "line": "4-6",
          "vars": {
            "found": "—",
            "truth": "—",
            "err": "haan, likhte waqt"
          }
        },
        {
          "title": "2. Sirf-v3 reader",
          "say": "Line 9 aur 13: <code>json_extract(doc, '$.address.pin')</code>. v1 aur v2 documents mein address.pin path nahi.",
          "line": "13",
          "vars": {
            "found": "2,974",
            "truth": "14,928",
            "err": "?"
          },
          "ask": {
            "q": "Reader ko 20% hi mila. Error kyun nahi aaya?",
            "choices": [
              "Gayab path par json_extract NULL deta hai; NULL LIKE se nahi milta, row chhoot gayi",
              "Error aaya tha, par SQLite ne warning bana ke log mein daal diya, query nahi roki",
              "v1 aur v2 documents corrupt hain, isliye SQLite ne v1/v2 documents padhe hi nahi"
            ],
            "answer": 0,
            "hint": "Jo field document mein hai hi nahi, json_extract kya lautata hai?",
            "explain": "Gayab path = NULL. <code>NULL LIKE '411%'</code> ka result bhi NULL hai — true nahi — isliye WHERE row ko chhod deta hai, aur v1/v2 ke Pune customers gine hi nahi gaye. Galat jawab, koi error nahi. Schema on read ka sabse bada khatra: galti chupchaap hoti hai.",
            "choiceExplanations": [
              "Gayab path = NULL. <code>NULL LIKE '411%'</code> ka result bhi NULL hai — true nahi — isliye WHERE row ko chhod deta hai, aur v1/v2 ke Pune customers gine hi nahi gaye. Galat jawab, koi error nahi. Schema on read ka sabse bada khatra: galti chupchaap hoti hai.",
              "SQLite ne koi warning nahi di; NULL lautana sahi bartav hai, galti reader ki thi.",
              "v1/v2 documents valid JSON hain; sirf field ka naam alag hai."
            ]
          }
        },
        {
          "title": "3. Reader badlo",
          "say": "Line 14: v2 bhi jaano (<code>coalesce</code> pehla non-NULL leta hai) → 7,418 (50%). Line 15: v1 bhi → 14,928 (100%). Har naye shape par har reader badalna pada.",
          "line": "14-15",
          "vars": {
            "found": "7,418 → 14,928",
            "truth": "14,928",
            "err": "kabhi nahi"
          }
        },
        {
          "title": "4. Migration",
          "say": "Line 19–22: <code>address.pin</code> ke bina wale documents v3 shape mein likho. 79,938 documents badle; ab sirf-v3 reader ko bhi 14,928.",
          "line": "17-22",
          "vars": {
            "found": "14,928",
            "truth": "14,928",
            "err": "—"
          },
          "ask": {
            "q": "Migration doosri baar chalao toh kitne documents badlenge?",
            "choices": [
              "0 — line 22 ki WHERE sirf bina address.pin wale documents chunti hai; ab koi nahi",
              "79,938 phir se — UPDATE har baar saare purane documents dobara likhta hai",
              "1,00,000 — doosri baar v3 documents bhi dobara likhe jaate hain"
            ],
            "answer": 0,
            "hint": "Line 22 ki WHERE kin documents ko chunti hai?",
            "explain": "WHERE json_extract(doc, '$.address.pin') IS NULL: pehli migration ke baad har document mein address.pin hai, toh 0 badle. Dobara chalana safe hai (idempotent) — test migration ke doosre run mein 0 badli rows jaanchta hai.",
            "choiceExplanations": [
              "WHERE json_extract(doc, '$.address.pin') IS NULL: pehli migration ke baad har document mein address.pin hai, toh 0 badle. Dobara chalana safe hai (idempotent) — test migration ke doosre run mein 0 badli rows jaanchta hai.",
              "Pehli migration ke baad koi v1/v2 document bacha hi nahi.",
              "v3 documents WHERE mein aate hi nahi; pehli baar bhi nahi chhue gaye."
            ]
          }
        }
      ],
      "lesson": "Schema hamesha hai: table ke rules mein, ya har reader aur har migration mein. Reader ka galat path chupchaap kam ginta hai. Migration ki WHERE migration ko idempotent banati hai."
    },
    {
      "type": "cards",
      "title": "🔍 Review ne kya pakda",
      "goal": "Lab 56 ki pehli review mein Codex ne do aise bug pakde jo numbers galat dikha rahe the.",
      "lesson": "Do tareekon ki tulna tabhi sach hai jab dono ek hi sawaal ka ek hi jawab dein, aur setup aur har query ke kaam ki boundary saaf ho.",
      "steps": [
        {
          "title": "1. Ek sawaal, do definitions",
          "say": "Graph walk har hop par ek global <code>seen</code> rakhta tha: 3–4 hops par ek pehle dekha dost dobara aage nahi badhta. SQL \"theek d kadam ke alag endpoints\" ginta hai. Ab walk har layer alag se dedupe karta hai, aur test chhote graph (cycle, self-loop, dohre edge) par depth 1–4 tak recursive SQL se milaata hai.",
          "ask": {
            "q": "Purane walk aur SQL ne 2 hops par same jawab diya. Bug chhupa kyun raha?",
            "choices": [
              "Test sirf depth 1 aur 2 jaanchta tha; definitions ka farq 3+ hops par dikhta hai",
              "SQL bhi galat tha, toh dono galat jawab aapas mein mil gaye",
              "2 hops par random graph mein cycles banti hi nahi, toh bug ho hi nahi sakta"
            ],
            "answer": 0,
            "hint": "Kis depth par pehle dekha node dobara pahuncha ja sakta hai?",
            "explain": "Depth 2 tak global seen ka asar aakhri layer par nahi padta tha. 3+ hops par ek node lambe raaste se dobara aata hai. Test sirf 1 aur 2 par tha, toh bug chhup gaya. Ab depth 1–4, cycles aur self-loops par recursive SQL se tulna.",
            "choiceExplanations": [
              "Depth 2 tak global seen ka asar aakhri layer par nahi padta tha. 3+ hops par ek node lambe raaste se dobara aata hai. Test sirf 1 aur 2 par tha, toh bug chhup gaya. Ab depth 1–4, cycles aur self-loops par recursive SQL se tulna.",
              "SQL ki definition seedhi thi; galti walk ki thi.",
              "Random graph mein cycles 2 hops par bhi ban sakti hain; farq aakhri layer ke dedupe ka tha."
            ]
          }
        },
        {
          "title": "2. Har query par naya array",
          "say": "Purana walk har query par <code>new Uint8Array(n + 1)</code> aur aakhri layer ka ek Set banata tha: 10 lakh users par har 2-hop query ~1 MB saaf karti thi. Naya walk marker array ek baar banata hai (generation marker) aur har layer alag dedupe karta hai.",
          "ask": {
            "q": "Purane numbers se kya galat nateeja nikal sakta tha?",
            "choices": [
              "Walk aur SQL ko barabar maan lena, jabki purana walk har query par zyada kaam karta tha",
              "SQL ko 10 guna tez maan lena, jabki SQL har baar cache se jawab de raha tha",
              "Walk ka jawab galat maan lena, jabki purana jawab 2 hops par SQL se milta tha"
            ],
            "answer": 0,
            "hint": "Kaam (400 endpoints) same tha; kaunsa kharcha users ke saath badha?",
            "explain": "Elapsed time ne purane implementation ka kharcha sahi gina: n-sized array aur Set. Naye implementation mein scratch reuse aur dedupe ka tareeka badla. Purane captures: 227–398 µs; naye: 18.6–19.6 µs, index wale SQL (162–168 µs) se ~8–9× tez. Allocation ka alag hissa profile nahi kiya. Seekh: benchmark mein setup, har query ka kaam aur reuse ki boundary saaf rakho.",
            "choiceExplanations": [
              "Elapsed time ne purane implementation ka kharcha sahi gina: n-sized array aur Set. Naye implementation mein scratch reuse aur dedupe ka tareeka badla. Purane captures: 227–398 µs; naye: 18.6–19.6 µs, index wale SQL (162–168 µs) se ~8–9× tez. Allocation ka alag hissa profile nahi kiya. Seekh: benchmark mein setup, har query ka kaam aur reuse ki boundary saaf rakho.",
              "Har query alag user ki thi; SQL cache se jawab nahi de raha tha.",
              "2-hop jawab SQL se milta tha; sawaal samay ki wajah ka tha."
            ]
          }
        },
        {
          "title": "3. Naam",
          "say": "Ek jaisa jawab aur ek jaisa kaam: <b>fair comparison</b>. Har kadam par alag-alag ginti: <b>per-layer dedupe</b>. Dobara chalane par kuch na badle: <b>idempotent</b>. Sab ya kuch nahi: <b>transaction</b> (BEGIN, COMMIT, ROLLBACK)."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Tests aur schema ka asli run",
      "project": "56-storage-taxonomy",
      "exercise": "ex4-schema",
      "goal": "8 tests: teeno shapes ka same jawab, index plan, walk vs recursive SQL, asli schema SQL aur migration, address move, vectors aur IVF, latency arithmetic. Phir ex4 ka asli run.",
      "why": "Node 24+ chahiye. Tests asli SQLite chalate hain (~1 second). ex4 asli SQLite hai; counts har run same, samay badlega.",
      "steps": [
        {
          "text": "Lab folder se: saare tests.",
          "cmd": "cd docker-labs/56-storage-taxonomy && npm test",
          "expect": "npm notice run lab-56-storage-taxonomy@1.0.0 test\nnpm notice run node --test test/*.test.js\n✔ the three shapes give the same answers (user + orders; Pune biryani count) (69.246757ms)\n✔ the join uses the index when it exists and scans orders when it does not (27.181218ms)\n✔ friend-of-friend: SQL self-join and the adjacency walk agree (134.261631ms)\n✔ walk() matches a recursive SQL count at depths 1–4, with cycles, self-loops and duplicate edges; no per-query allocation (141.279239ms)\n✔ schema on write: the ex4 table refuses bad rows; schema on read: readers and the migration (real ex4 SQL) (1.350754ms)\n✔ moving house: a crash without a transaction leaves mixed copies; inside one transaction it leaves none changed (10.632801ms)\n✔ vectors: the SQL scan and the JS scan return the same top 10; IVF finds them when the data has clumps (368.775669ms)\n✔ commit-latency arithmetic: serial steps add, parallel steps take the slowest (ex6 model) (0.527396ms)\nℹ tests 8\nℹ suites 0\nℹ pass 8\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0\nℹ duration_ms 810.338368"
        },
        {
          "text": "Schema on write vs read.",
          "cmd": "npm start -- ex4-schema",
          "expect": "REAL RUN: Node v24.18.0, SQLite 3.53.1\n\n== A. schema on write: a STRICT table with rules ==\ngood row                   → saved\npincode 4110 (too short)   → refused: CHECK constraint failed: length(pincode) = 6 AND pincode GLOB '[1-9][0-9][0-9][0-9][0-9][0-9]'\nno pincode                 → refused: NOT NULL constraint failed: customers.pincode\npincode 41100X (not digits) → refused: CHECK constraint failed: length(pincode) = 6 AND pincode GLOB '[1-9][0-9][0-9][0-9][0-9][0-9]'\n\n== B. schema on read: 1,00,000 customer documents from three app versions ==\nv1 {zip}: 49,935   v2 {postal_code}: 30,003   v3 {address:{pin}}: 20,062   — the database accepted all three\nQuestion: how many customers are in Pune (pincode 411xxx)? True answer: 14,928\nreader knows only v3         →  2,974  (20% of the truth, no error shown)\nreader knows v2 + v3         →  7,418  (50% of the truth, no error shown)\nreader knows v1 + v2 + v3    → 14,928  (100% of the truth, no error shown)\nmigration: 79,938 documents rewritten to v3 in 156 ms → the v3-only reader now finds 14,928 (100%)\nThe schema exists either way: in the table, or in every reader and every migration."
        }
      ],
      "observe": {
        "q": "ex4 ka hissa A: <code>'41100X'</code> refuse hua. Agar app JS Number 411004 bhejti toh?",
        "choices": [
          "Refuse — Node Number ko REAL bhejta hai, text '411004.0' banta hai, CHECK fail",
          "Save — STRICT TEXT column number ko '411004' bana ke maan leta hai, CHECK pass",
          "Refuse — STRICT table har number ko turant mana karti hai, CHECK tak nahi pahunchta"
        ],
        "answer": 0,
        "hint": "Node JS Number ko SQLite mein kis type mein bhejta hai?",
        "explain": "Lab ke Node v24.18.0 mein JS Number 411004 → SQLite REAL → text '411004.0'; 6 ank wala CHECK reject karta hai. String '411004' aur BigInt 411004n pass karte hain. STRICT bina nuksaan ka badlaav karne deti hai, toh CHECK ka format rule asli rakshak hai. Pincode string hi chahiye toh app ki boundary par type bhi jaancho.",
        "choiceExplanations": [
          "Lab ke Node v24.18.0 mein JS Number 411004 → SQLite REAL → text '411004.0'; 6 ank wala CHECK reject karta hai. String '411004' aur BigInt 411004n pass karte hain. STRICT bina nuksaan ka badlaav karne deti hai, toh CHECK ka format rule asli rakshak hai. Pincode string hi chahiye toh app ki boundary par type bhi jaancho.",
          "Number REAL ban ke '411004.0' hota hai; CHECK fail. BigInt 411004n hota toh '411004' ban ke pass.",
          "STRICT bina nuksaan wala badlaav karne deti hai; is case mein CHECK ne roka, STRICT ne nahi."
        ]
      },
      "lesson": "Tests ek-jaise jawab, asli SQL aur migration ka dobara chalna jaanchte hain. Schema on write mein rules database mein; on read mein har reader mein."
    }
  ],
  "interview": {
    "title": "Interview Round — copies aur schema",
    "instructions": "Pehle socho: crash kahan ho sakta hai, aur reader kaunse purane shapes nahi jaanta? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "MongoDB mein user ka address 6 documents mein copy hai. Script ek-ek karke badalti hai aur beech mein crash hoti hai. Agli baar kya badloge?",
        "choices": [
          "Saare 6 writes ek multi-document transaction mein, ya address ek jagah rakho aur padhte waqt jodo",
          "Script ko tez karo — jitna jaldi chalegi, crash ke beech aane ka mauka utna kam",
          "Har write ke baad 1 second ruko — database ko har copy pakki karne ka samay mil jaayega",
          "Crash ke baad documents chhod do — agla address change apne aap sab theek kar dega"
        ],
        "answer": 0,
        "explain": "Copies ke beech crash = mila-jula sach (lab ex1: 3 naye, 3 purane). Transaction sab-ya-kuch-nahi deta (MongoDB multi-document transactions bhi deta hai); ya copy hi mat rakho aur padhte waqt address jodo ($lookup ya join).",
        "choiceExplanations": [
          "Copies ke beech crash = mila-jula sach (lab ex1: 3 naye, 3 purane). Transaction sab-ya-kuch-nahi deta (MongoDB multi-document transactions bhi deta hai); ya copy hi mat rakho aur padhte waqt address jodo ($lookup ya join).",
          "Tez script mein crash ka mauka kam ho sakta hai, par mila-jula sach ab bhi mumkin hai.",
          "Rukne se pehle ke writes pakke hote hain, par crash ke baad baaki copies phir bhi purani.",
          "Agla change kab aayega, pata nahi; tab tak courier galat ghar jaata rahega."
        ]
      },
      {
        "q": "Analytics report Pune ke sirf lagbhag 20% customers ginti hai; billing records kahin zyada dikhate hain. App ke teen versions ne alag field paths likhe hain. Pehle kya jaanchoge?",
        "choices": [
          "Reader ke field paths — purane zip aur postal_code shayad NULL ban ke chhoot rahe hain",
          "Database ka disk — shayad 80% documents corrupt ho gaye aur padhe nahi ja rahe",
          "Report ka cache — shayad bahut purana nateeja dikh raha hai, live count alag hai",
          "Pune ke pincode badal gaye honge — naye pincode 411 se shuru nahi hote"
        ],
        "answer": 0,
        "explain": "Lab ex4: sirf-v3 reader ko 14,928 mein se 2,974 (~20%) mile, bina error. Gayab path NULL deta hai aur WHERE row chupchaap chhod deta hai. Prompt mein version differences diye hain, toh pehle reader ke paths aur har version ki ginti jaancho; phir reader badlo ya migration chalao.",
        "choiceExplanations": [
          "Lab ex4: sirf-v3 reader ko 14,928 mein se 2,974 (~20%) mile, bina error. Gayab path NULL deta hai aur WHERE row chupchaap chhod deta hai. Prompt mein version differences diye hain, toh pehle reader ke paths aur har version ki ginti jaancho; phir reader badlo ya migration chalao.",
          "Corruption valid JSON mein bhi galat value chhod sakti hai; par prompt ka seedha clue version differences hai, toh pehle reader paths, phir integrity checks.",
          "Purana cache bhi kam count dikha sakta hai. Pehle live query ke reader paths jaancho, phir cached aur live count milao.",
          "Pincode badalne ki koi khabar nahi; versions ke field paths ka farq seedha clue hai."
        ]
      }
    ]
  },
  "success": [
    "Copies ke beech crash ka asar code se samjha sakte ho",
    "Schema on read ki chupi galti pakad sakte ho",
    "Idempotent migration aur fair comparison samjha sakte ho"
  ],
  "cards": [
    {
      "front": "moveAddress() crash, bina transaction?",
      "back": "Har UPDATE turant pakka: 3 naye, 3 purane. Transaction ke saath ROLLBACK: 0 badle, sab ek jaisa; move dobara chalao."
    },
    {
      "front": "Schema on read: reader v3 hi jaanta hai?",
      "back": "Gayab path par json_extract NULL deta hai. NULL LIKE '411%' bhi NULL — true nahi — toh WHERE row chhod deta hai. Lab ex4: 14,928 mein se 2,974 (~20%), bina error."
    },
    {
      "front": "Idempotent migration?",
      "back": "WHERE sirf purane shape chunti hai (address.pin IS NULL). Pehli baar 79,938 badle, doosri baar 0. Test doosre run mein 0 badli rows jaanchta hai."
    }
  ]
}
]);
})();
