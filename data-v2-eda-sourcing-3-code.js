/* Playlist · EDA Core topic 5: Event sourcing. Source credit: Software Developer Diaries,
   "Event Sourcing: Genius or Just Over-Engineering?" (wXg_aON4oj8).
   Numbers: docker-labs/50-event-sourcing/captures. */
(function () {
const HERO = [{"id": "ap", "icon": "🔢", "label": "append()", "x": 140, "y": 105}, {"id": "fo", "icon": "📒", "label": "fold()", "x": 445, "y": 105}, {"id": "cu", "icon": "🔁", "label": "catchUp()", "x": 750, "y": 105}];
const EDGES = [{"from": "ap", "to": "fo"}, {"from": "fo", "to": "cu"}];
VISUALS["es-code"] = { t: "Teen functions: append version jaanchta hai, fold events jodta hai, catchUp checkpoint ke saath read model banata hai.", html: SD.viz.svg(HERO, EDGES, { nodes: { ap: {tone:'acc',badge:'version ki shart'}, fo: {tone:'acc',badge:'events → haalat'}, cu: {tone:'acc',badge:'checkpoint saath'} } }, {w:890,h:215}) };
SD.registerLevels('sdd-eda', [
{
  "id": "es-code",
  "icon": "💻",
  "group": "📒 Event Sourcing",
  "title": "Sourcing 3 · Code — append ki shart, fold aur checkpoint",
  "badge": "Passbook Kaarigar",
  "objectives": [
    "append() mein version ki shart kahan lagti hai, aur UNIQUE akela kyun kaafi nahi?",
    "fold() events se haalat kaise banata hai, aur upcast kahan baithta hai?",
    "catchUp() mein checkpoint kab likhna chahiye?"
  ],
  "lesson": [
    "<h3>💻 Teen functions, poora pattern</h3><p>Lab 50 ka core teen functions mein hai: <b>append</b> (likhna, version ki shart ke saath), <b>fold</b> (events se haalat), aur <b>catchUp</b> (store se read model, checkpoint ke saath).</p><p>Har function mein ek line hai jo galat ho toh paisa gayab. Code khol ke dekho.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "🔢 append(): version ki shart",
      "goal": "lib/events.js. A ne Withdrawn 80 likh diya (store v3, ₹20). Ab B likhne aaya — B ne v2 padha tha, toh expected = 2.",
      "code": {
        "title": "lib/events.js",
        "file": "docker-labs/50-event-sourcing/lib/events.js",
        "from": 8,
        "text": "function append(db, stream, expected, events) {\n  db.exec('BEGIN IMMEDIATE');\n  try {\n    const cur = db.prepare('SELECT max(version) v FROM events WHERE stream = ?').get(stream).v || 0;\n    if (expected !== 'any' && cur !== expected) throw new Conflict(`expected v${expected}, stream v${cur} par`);\n    const ins = db.prepare('INSERT INTO events (stream, version, type, schema, data) VALUES (?, ?, ?, ?, ?)');\n    let pos = 0;\n    events.forEach((e, i) => { pos = Number(ins.run(stream, cur + 1 + i, e.type, e.schema || 2, JSON.stringify(e.data)).lastInsertRowid); });\n    db.exec('COMMIT');\n    return { version: cur + events.length, pos };\n  } catch (err) { if (db.isTransaction) db.exec('ROLLBACK'); throw err; }\n}"
      },
      "vars": [
        {
          "id": "exp",
          "label": "expected"
        },
        {
          "id": "cur",
          "label": "cur"
        },
        {
          "id": "res",
          "label": "Nateeja"
        }
      ],
      "steps": [
        {
          "title": "1. Transaction shuru",
          "say": "Line 9: BEGIN IMMEDIATE — likhne wala transaction shuru. Is transaction ke khatam hone tak doosra writer ruka rehta hai.",
          "line": "9",
          "vars": {
            "exp": "2",
            "cur": "—",
            "res": "—"
          }
        },
        {
          "title": "2. Store kahan hai?",
          "say": "Line 11: stream ka sabse bada version — cur = 3 (A ka Withdrawn v3 par likha ja chuka).",
          "line": "11",
          "vars": {
            "exp": "2",
            "cur": "3",
            "res": "—"
          }
        },
        {
          "title": "3. Shart",
          "say": "Line 12: expected 'any' nahi hai, aur cur (3) expected (2) ke barabar nahi.",
          "line": "12",
          "vars": {
            "exp": "2",
            "cur": "3",
            "res": "Conflict"
          },
          "ask": {
            "q": "expected = 2, cur = 3. Line 12 ke baad kya hoga?",
            "choices": [
              "Conflict phenka jaayega; line 18 ROLLBACK karke error aage degi — kuch nahi likha",
              "Version 4 par B ka event likh diya jaayega — expected sirf salaah hai, shart nahi",
              "cur 2 par lautega: A ka v3 hata ke B ka event v3 par likha jaayega"
            ],
            "answer": 0,
            "hint": "expected !== 'any' aur cur !== expected — dono sach hain?",
            "explain": "2 !== 3, toh Conflict. catch (line 18) transaction ROLLBACK karta hai aur error aage deta hai. lib/handler.js ka loop Conflict pakad ke dobara padhta hai: ₹20, toh command mana. expected = 'any' hota toh line 12 kuch nahi jaanchti — video jaisa.",
            "choiceExplanations": [
              "2 !== 3, toh Conflict. catch (line 18) transaction ROLLBACK karta hai aur error aage deta hai. lib/handler.js ka loop Conflict pakad ke dobara padhta hai: ₹20, toh command mana. expected = 'any' hota toh line 12 kuch nahi jaanchti — video jaisa.",
              "Line 12 throw karti hai; throw ke baad lines 13–17 chalti hi nahi.",
              "Code mein mitane wali koi line nahi. Event store se event kabhi nahi mit-ta."
            ]
          }
        },
        {
          "title": "4. 'any' hota toh?",
          "say": "'any' mode mein line 12 kuch nahi jaanchti. Line 15 version cur + 1 + i = 4 par likhti. Table par UNIQUE (stream, version) hai, par v4 khaali tha.",
          "line": "15",
          "vars": {
            "exp": "'any'",
            "cur": "3",
            "res": "v4 likha: ₹−60"
          },
          "ask": {
            "q": "Table par UNIQUE (stream, version) hai. Phir 'any' mode mein B ka event kyun jud gaya?",
            "choices": [
              "'any' mein version line 11 ka cur + 1 hai — B ko v4 mila, UNIQUE ko takraav dikha hi nahi",
              "UNIQUE sirf ek process ke andar kaam karta hai; A aur B alag-alag processes the",
              "WAL mode mein SQLite UNIQUE ki jaanch commit ke baad karta hai, likhte waqt nahi"
            ],
            "answer": 0,
            "hint": "B ka version kisne chuna — B ne padh ke, ya store ne likhte waqt?",
            "explain": "B ko likhte waqt cur 3 mila, toh event v4 par gaya; v4 khaali tha. UNIQUE ek stream-version jodi ko do baar likhne se rokta hai. Handler padhe hue v2 se agla version v3 chunta, toh A ka v3 takraata. Lab mein version store ke current version se chuna jaata hai, isliye purane faisle ko line 12 ki expected-version jaanch rokti hai.",
            "choiceExplanations": [
              "B ko likhte waqt cur 3 mila, toh event v4 par gaya; v4 khaali tha. UNIQUE ek stream-version jodi ko do baar likhne se rokta hai. Handler padhe hue v2 se agla version v3 chunta, toh A ka v3 takraata. Lab mein version store ke current version se chuna jaata hai, isliye purane faisle ko line 12 ki expected-version jaanch rokti hai.",
              "UNIQUE database ka niyam hai; kitne bhi processes likhein, jaanch DB mein hoti hai.",
              "UNIQUE har INSERT par turant jaanchta hai. Yahan takraav tha hi nahi: v4 khaali tha."
            ]
          }
        },
        {
          "title": "5. Kamyaab append",
          "say": "Lines 16–17: A ke append mein shart theek thi (cur 2 = expected 2), toh COMMIT, aur naya version v3 + pos lautaya. Pos poore store ka kram hai — projector store ko isi pos ke kram mein padhta hai.",
          "line": "16-17",
          "vars": {
            "exp": "2 (A ne v2 padha)",
            "cur": "2",
            "res": "v3, pos lautaya"
          }
        }
      ],
      "lesson": "append() ek transaction mein teen kaam karta hai: aakhri version padho (line 11), shart jaancho (line 12), aage ke version par likho (line 15). Shart ke bina UNIQUE kuch nahi bachata, kyunki version likhte waqt hi chuna jaata hai."
    },
    {
      "type": "dryrun",
      "title": "📒 fold(): events se balance, raaste mein upcast",
      "goal": "lib/account.js. Purana khaata: Opened, MoneyAdded {amt: 50} (schema 1), MoneyAdded {amt: 30} (schema 1), Deposited 70, Withdrawn 20. Lab ka ex3-replay upcast wala stream.",
      "code": {
        "title": "lib/account.js",
        "file": "docker-labs/50-event-sourcing/lib/account.js",
        "from": 3,
        "text": "function upcast(e) {\n  if (e.type === 'MoneyAdded' && e.schema === 1) return { ...e, type: 'Deposited', schema: 2, data: { amount: e.data.amt, source: 'purana' } };\n  return e;\n}\nfunction apply(state, e) {\n  switch (e.type) {\n    case 'Opened': return { ...state, open: true };\n    case 'Deposited': return { ...state, balance: state.balance + e.data.amount };\n    case 'Withdrawn': return { ...state, balance: state.balance - e.data.amount };\n    default: return state;                           // anjaana type chhoot jaata hai — upcaster ke bina yahi galti\n  }\n}\nconst EMPTY = { open: false, balance: 0, version: 0 };\nfunction fold(events, start = EMPTY, { upcasting = true } = {}) {\n  return events.reduce((s, e) => ({ ...apply(s, upcasting ? upcast(e) : e), version: e.version }), start);\n}"
      },
      "vars": [
        {
          "id": "ev",
          "label": "Event"
        },
        {
          "id": "bal",
          "label": "Balance"
        },
        {
          "id": "ver",
          "label": "Version"
        }
      ],
      "steps": [
        {
          "title": "1. Shuru",
          "say": "Line 17: reduce — EMPTY (balance 0) se shuru; har event par apply(upcast(e)), aur version = e.version. v1 Opened: line 9, balance 0.",
          "line": "16-17",
          "vars": {
            "ev": "v1 Opened",
            "bal": "0",
            "ver": "1"
          }
        },
        {
          "title": "2. Purana roop",
          "say": "v2: MoneyAdded {amt: 50}, schema 1. Line 4 purane MoneyAdded ko Deposited {amount: 50} mein badalti hai — sirf memory mein; DB mein event jaisa tha waisa.",
          "line": "3-4",
          "vars": {
            "ev": "v2 MoneyAdded → Deposited 50",
            "bal": "0",
            "ver": "1"
          }
        },
        {
          "title": "3. Jama",
          "say": "Line 10: Deposited — balance 0 + 50 = 50. v3 bhi MoneyAdded {amt: 30}, upcast ke baad line 10: 80.",
          "line": "10",
          "vars": {
            "ev": "v3 → Deposited 30",
            "bal": "80",
            "ver": "3"
          }
        },
        {
          "title": "4. Upcaster na ho toh?",
          "say": "Lab ka \"bina upcaster\" run: upcasting = false. MoneyAdded seedha apply() mein jaata hai.",
          "line": "12",
          "vars": {
            "ev": "v2 MoneyAdded (bina upcast)",
            "bal": "?",
            "ver": "2"
          },
          "ask": {
            "q": "upcasting: false ho toh MoneyAdded kis line par pahunchega?",
            "choices": [
              "Line 12 (default) — haalat waisi hi; ₹50 aur ₹30, dono chupchaap chhoot jaate hain",
              "Line 10 — Deposited jaisa hi jud jaayega, kyunki MoneyAdded bhi ek deposit hi hai",
              "Kahin nahi — switch anjaana type dekh ke error phenkta hai aur fold ruk jaata hai"
            ],
            "answer": 0,
            "hint": "switch mein MoneyAdded ka case hai?",
            "explain": "switch MoneyAdded nahi pehchaanta, toh default (line 12): haalat waisi hi. Lab: bina upcaster balance 50 (sirf 70 − 20), upcaster ke saath 130. Galat balance, aur error bhi nahi.",
            "choiceExplanations": [
              "switch MoneyAdded nahi pehchaanta, toh default (line 12): haalat waisi hi. Lab: bina upcaster balance 50 (sirf 70 − 20), upcaster ke saath 130. Galat balance, aur error bhi nahi.",
              "switch type ka naam milata hai, matlab nahi. 'MoneyAdded' aur 'Deposited' alag strings hain.",
              "default ek case hai jo haalat lauta deta hai; koi error nahi — isliye galti chupchaap hoti hai."
            ]
          }
        },
        {
          "title": "5. Aakhir",
          "say": "v4 Deposited 70: 150. v5 Withdrawn 20 (line 11): 130, version 5. Handler isi version (5) ko append mein expected deta hai.",
          "line": "10-11",
          "vars": {
            "ev": "v5 Withdrawn 20",
            "bal": "130",
            "ver": "5"
          }
        }
      ],
      "lesson": "fold = events par reduce. upcast padhne ke raaste mein hai, DB mein nahi. switch ka default anjaane events ko chupchaap chhod deta hai — naya event type aaye toh fold, projector aur upcaster, teeno ko pata hona chahiye."
    },
    {
      "type": "dryrun",
      "title": "🔁 catchUp(): checkpoint board ke saath",
      "goal": "lib/projector.js. Checkpoint 2; store mein pos 3 = a1 Withdrawn 30; board par a1 ₹100.",
      "code": {
        "title": "lib/projector.js",
        "file": "docker-labs/50-event-sourcing/lib/projector.js",
        "from": 17,
        "text": "function catchUp(db, name, { mode = 'together', batch = 100, afterApply = () => {} } = {}) {\n  const events = readAll(db, getCheckpoint(db, name), batch);\n  for (const e of events) {\n    if (mode === 'together') tx(db, () => { applyToReadModel(db, e); afterApply(e); saveCheckpoint(db, name, e.pos); });\n    else { tx(db, () => applyToReadModel(db, e)); afterApply(e); tx(db, () => saveCheckpoint(db, name, e.pos)); }\n  }\n  return events.length;\n}"
      },
      "vars": [
        {
          "id": "cp",
          "label": "Checkpoint"
        },
        {
          "id": "board",
          "label": "Board a1"
        },
        {
          "id": "ev",
          "label": "Haath mein"
        }
      ],
      "steps": [
        {
          "title": "1. Naye events",
          "say": "Line 18: checkpoint (2) ke baad ke events padho — pos 3: a1 Withdrawn 30.",
          "line": "18",
          "vars": {
            "cp": "2",
            "board": "100",
            "ev": "pos 3"
          }
        },
        {
          "title": "2. together",
          "say": "Line 20: ek tx mein teen kaam — board par −30 (applyToReadModel), afterApply, aur checkpoint = 3. COMMIT tak kuch pakka nahi.",
          "line": "20",
          "vars": {
            "cp": "2 → 3 (commit baaki)",
            "board": "70 (commit baaki)",
            "ev": "pos 3"
          }
        },
        {
          "title": "3. Beech mein crash",
          "say": "Socho: afterApply ke waqt process crash, COMMIT se pehle.",
          "line": "20",
          "vars": {
            "cp": "?",
            "board": "?",
            "ev": "pos 3"
          },
          "ask": {
            "q": "together mode, COMMIT se pehle crash. Restart par board kitna?",
            "choices": [
              "₹70 — tx commit nahi hua; board aur checkpoint dono wapas, phir pos 3 ek baar laga",
              "₹40 — board ka −30 pehle likha ja chuka tha, restart par −30 dobara laga",
              "₹100 — restart ke baad projector pos 3 chhod ke seedha agle event par jaata hai"
            ],
            "answer": 0,
            "hint": "COMMIT ke bina transaction ka kya hota hai?",
            "explain": "COMMIT se pehle crash = transaction ka kuch bhi pakka nahi: board 100, checkpoint 2. Restart par line 18 phir pos 3 deti hai; is baar commit: board 70, checkpoint 3. Lab together: crash 1, galat 0.",
            "choiceExplanations": [
              "COMMIT se pehle crash = transaction ka kuch bhi pakka nahi: board 100, checkpoint 2. Restart par line 18 phir pos 3 deti hai; is baar commit: board 70, checkpoint 3. Lab together: crash 1, galat 0.",
              "Board ka −30 bhi commit na hue transaction mein tha — crash par mit gaya.",
              "Checkpoint 2 par tha; restart par pos 3 hi pehle aata hai."
            ]
          }
        },
        {
          "title": "4. split",
          "say": "Line 21 (split): board ka tx alag commit, phir afterApply, phir checkpoint ka alag tx. Crash beech mein: board 70 pakka, checkpoint 2. Restart par pos 3 dobara: board 40. Lab split: a4 read model 40, store 70.",
          "line": "21",
          "vars": {
            "cp": "2",
            "board": "70 → 40",
            "ev": "pos 3 (dobara)"
          }
        }
      ],
      "lesson": "Projector ki yaad = checkpoint. Read model ka badlaav aur checkpoint ek transaction mein ho (line 20), ya badlaav khud idempotent ho (version dekh ke purana event chhodo). Alag-alag (line 21) = crash par dohra kaam."
    },
    {
      "type": "cards",
      "title": "🔧 Apne system mein: lab se aage",
      "goal": "Lab mein ek writer, ek stream ka niyam aur ek projector hai. Asli system mein aise sawaal bhi aate hain.",
      "lesson": "Pos ka gap, snapshot ka version, do streams ke niyam aur client ka retry — teeno-chaaron design mein pehle din se socho.",
      "steps": [
        {
          "title": "1. Pos mein gap",
          "say": "Lab mein SQLite ek waqt ek writer chalata hai, toh pos kram mein commit hote hain. Postgres sequence se pos lo, toh pos 11 pos 10 se pehle commit ho sakta hai.",
          "ask": {
            "q": "Pos 11 commit ho gaya, pos 10 abhi baaki. Projector ne 11 padh ke checkpoint 11 likha. Kya hoga?",
            "choices": [
              "Pos 10 commit hone ke baad bhi kabhi nahi padha jaayega — checkpoint aage nikal gaya",
              "Kuch nahi — projector agli baar pos 10 ko bhi apne aap dhoondh ke padh lega",
              "Pos 10 ka transaction fail hoga, kyunki pos 11 pos 10 se pehle commit ho chuka"
            ],
            "answer": 0,
            "hint": "Projector checkpoint ke baad kya padhta hai?",
            "explain": "Sequence number commit ka kram nahi hai. Pos 10 pending ho aur checkpoint 11 ho jaaye, toh pos 10 chhoot sakta hai. Sirf kuch ms rukna guarantee nahi. Commit ke kram wala cursor (CDC/WAL) lo, ya pending aur rollback wale gaps sambhaalne ka pakka tareeka banao — aur overlap dobara padho toh duplicate apply bhi roko.",
            "choiceExplanations": [
              "Sequence number commit ka kram nahi hai. Pos 10 pending ho aur checkpoint 11 ho jaaye, toh pos 10 chhoot sakta hai. Sirf kuch ms rukna guarantee nahi. Commit ke kram wala cursor (CDC/WAL) lo, ya pending aur rollback wale gaps sambhaalne ka pakka tareeka banao — aur overlap dobara padho toh duplicate apply bhi roko.",
              "Projector sirf checkpoint ke baad padhta hai (pos > 11). Pos 10 peeche reh gaya.",
              "Sequence ka number aur commit ka kram alag hain; dono transactions apne aap commit ho jaate hain."
            ]
          }
        },
        {
          "title": "2. Snapshot ka version",
          "say": "Fold ka code badla (naya event type, naya niyam)? Purane snapshots purane code ki haalat hain. Snapshot ke saath code ka version rakho; version badla toh snapshot events se dobara banao."
        },
        {
          "title": "3. Do streams ka niyam",
          "say": "Expected version ek stream (ek account) ke andar bachata hai. Do accounts ke beech transfer? Microsoft: \"the application must still handle conflicts that span multiple entities\". Do streams ke steps ko track karne wala workflow chahiye: har step poora karo, failure par retry ya sudhaar ka step chalao. Aise workflow ko <b>saga</b> ya <b>process manager</b> kehte hain."
        },
        {
          "title": "4. Client ka retry",
          "say": "Lab ke dual crash mein client ko error mila, par paisa kat chuka tha. Client command id ke saath dobara bheje, aur handler us command id ko pehchaane — warna retry par do withdraw."
        }
      ]
    }
  ],
  "interview": {
    "title": "Interview Round — code ki nazar se",
    "instructions": "Pehle socho: version kisne chuna, aur crash kis line ke beech hua? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Code review: append(db, stream, 'any', events) har jagah. Developer kehta hai: \"Table par UNIQUE (stream, version) hai, toh race safe hai.\" Sahi hai?",
        "choices": [
          "Nahi — 'any' mein version store chunta hai; UNIQUE ko takraav kabhi dikhta hi nahi",
          "Haan — UNIQUE do events ko ek version par kabhi likhne nahi deta, toh race nahi hogi",
          "Haan — BEGIN IMMEDIATE ek waqt ek writer chalata hai, toh race ho hi nahi sakti",
          "Nahi — UNIQUE sirf ek process ke andar kaam karta hai, kai processes ke beech nahi"
        ],
        "answer": 0,
        "explain": "'any' mein version likhte waqt chuna jaata hai (cur + 1), toh UNIQUE kabhi nahi takraata. Race padhne aur likhne ke beech hai: dono ne v2 padha, dono jud gaye. BEGIN IMMEDIATE likhna ek-ek karke karta hai, par faisla pehle hi purane data par ho chuka tha. Expected version hi faisle ko padhe hue version se baandhta hai.",
        "choiceExplanations": [
          "'any' mein version likhte waqt chuna jaata hai (cur + 1), toh UNIQUE kabhi nahi takraata. Race padhne aur likhne ke beech hai: dono ne v2 padha, dono jud gaye. BEGIN IMMEDIATE likhna ek-ek karke karta hai, par faisla pehle hi purane data par ho chuka tha. Expected version hi faisle ko padhe hue version se baandhta hai.",
          "UNIQUE ek version par do events rokta hai, par 'any' mein dono ko alag version mile (v3, v4).",
          "Writers ek-ek karke likhte hain, par dono ka faisla purane ₹100 par ho chuka tha. Kram likhne ka hai, faisle ka nahi.",
          "UNIQUE DB ka niyam hai, sab processes par lagta hai. Dikkat UNIQUE mein nahi — version store chunta hai."
        ]
      },
      {
        "q": "Projector ka code: read model update karo, commit; phir checkpoint save karo, commit. Kabhi-kabhi read model mein deposit do baar dikhta hai. Fix?",
        "choices": [
          "Update aur checkpoint ek transaction mein; ya update ko version dekh ke idempotent banao",
          "Checkpoint pehle save karo, phir update karo — tab koi event dobara nahi lagega",
          "Projector ko kabhi restart mat karo; crash par sirf alert bhejo aur rok do",
          "Har event ko do baar padh ke compare karo, aur dono same hon tabhi update karo"
        ],
        "answer": 0,
        "explain": "Update commit hua, checkpoint nahi — crash par wahi event dobara laga (lab split: a4 read model 40, store 70). Dono ek transaction mein rakho (lab together: 0 galat), ya read model mein version rakho aur purana version dobara aaye toh chhod do.",
        "choiceExplanations": [
          "Update commit hua, checkpoint nahi — crash par wahi event dobara laga (lab split: a4 read model 40, store 70). Dono ek transaction mein rakho (lab together: 0 galat), ya read model mein version rakho aur purana version dobara aaye toh chhod do.",
          "Ulta karne se ulti dikkat: checkpoint aage badha aur update se pehle crash — event hamesha ke liye chhoota.",
          "Crash hote rahenge; restart ke baad sahi chalna hi design ka kaam hai.",
          "Event do baar padhne se dohra apply nahi rukta. Dikkat commit aur checkpoint ke beech ka crash hai."
        ]
      }
    ]
  },
  "success": [
    "append() mein version ki shart aur UNIQUE ka farq dikha sakte ho",
    "fold() aur upcast ka raasta samjha sakte ho",
    "catchUp() ka checkpoint kab likhna hai, bata sakte ho"
  ],
  "cards": [
    {
      "front": "UNIQUE (stream, version) race rokta hai?",
      "back": "UNIQUE sirf duplicate stream-version jodi rokta hai. Lab mein naya version store ke current version se chunta hai; purane faisle ko line 12 ka expected-version check rokta hai."
    },
    {
      "front": "Upcaster kahan chalta hai?",
      "back": "Padhne ke raaste mein (fold se pehle). DB ka event wahi rehta hai."
    },
    {
      "front": "Projector ka checkpoint kab likho?",
      "back": "Read model ke badlaav ke saath, ek hi transaction mein. Alag likha toh crash par dohra kaam."
    }
  ]
}
]);
})();
