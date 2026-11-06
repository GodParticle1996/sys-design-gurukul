/* Playlist · EDA Core topic 5: Event sourcing. Source credit: Software Developer Diaries,
   "Event Sourcing: Genius or Just Over-Engineering?" (wXg_aON4oj8).
   Numbers: docker-labs/50-event-sourcing/captures. */
(function () {
const HERO = [{"id": "a", "icon": "🧑‍💼", "label": "handler A", "x": 150, "y": 85}, {"id": "b", "icon": "🧑‍💼", "label": "handler B", "x": 150, "y": 245}, {"id": "store", "icon": "📒", "label": "event store a1", "x": 560, "y": 165}];
const EDGES = [{"from": "a", "to": "store"}, {"from": "b", "to": "store"}];
VISUALS["es-kaise"] = { t: "Dono handlers ne ₹100 (v2) dekha. Version maange bina dono jud gaye: −60.", html: SD.viz.svg(HERO, EDGES, { nodes: { a: {tone:'ok',badge:'−80'}, b: {tone:'bad',badge:'−80 bhi?'}, store: {tone:'bad',badge:'−60'} } }, {w:890,h:330}) };
SD.registerLevels('sdd-eda', [
{
  "id": "es-kaise",
  "icon": "🔧",
  "group": "📒 Event Sourcing",
  "title": "Sourcing 2 · Kaise — version ki shart, read model aur snapshot",
  "badge": "Passbook Sevak",
  "objectives": [
    "Do commands ek saath aayein toh minus balance kaise rokein?",
    "Read model store se kaise bane ki koi event na chhoote?",
    "Lambi passbook, purana roop aur dheema board — har ek ka ilaaj?"
  ],
  "lesson": [
    "<h3>🧾 Do cashier, ek passbook</h3><p>Ravi ke khaate mein ₹100. Do cashier ek saath ₹80 nikaalne ki parchi uthate hain. Dono passbook dekhte hain: ₹100 — kaafi hai.</p><p>Dono likh dein toh? Aur bank ke bahar ek notice board bhi hai jahan balance dikhta hai. Pehle dekho.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "🔢 Do handlers, ek passbook — version ki shart",
      "goal": "Ek account ke events ki alag list = <b>stream</b>; stream ka version = aakhri event ka number. a1 mein ₹100 (v2). Handler A aur B dono ₹80 nikaalne aaye. Padhne aur likhne ke beech 20 ms ka kaam (fraud check). Lab 50 ka ex0-slowmo --story race, nakli ghadi par asli event store code.",
      "nodes": [
        {
          "id": "a",
          "icon": "🧑‍💼",
          "label": "handler A",
          "x": 150,
          "y": 85
        },
        {
          "id": "b",
          "icon": "🧑‍💼",
          "label": "handler B",
          "x": 150,
          "y": 245
        },
        {
          "id": "store",
          "icon": "📒",
          "label": "event store a1",
          "x": 560,
          "y": 165
        }
      ],
      "edges": [
        {
          "from": "a",
          "to": "store"
        },
        {
          "from": "b",
          "to": "store"
        }
      ],
      "viz": {
        "w": 890,
        "h": 330,
        "focus": [
          "b",
          "store"
        ]
      },
      "vars": [
        {
          "id": "store",
          "label": "Store mein"
        },
        {
          "id": "ver",
          "label": "Store ka version"
        },
        {
          "id": "a",
          "label": "A ne dekha"
        },
        {
          "id": "b",
          "label": "B ne dekha"
        }
      ],
      "steps": [
        {
          "title": "Dono ne padha",
          "clock": "0 ms",
          "say": "A aur B dono ne a1 padha: ₹100, version v2. Dono ka 20 ms ka kaam shuru.",
          "nodes": {
            "a": {
              "tone": "busy",
              "badge": "100 · v2"
            },
            "b": {
              "tone": "busy",
              "badge": "100 · v2"
            },
            "store": {
              "tone": "ok",
              "badge": "₹100"
            }
          },
          "vars": {
            "store": "₹100",
            "ver": "v2",
            "a": "100 · v2",
            "b": "100 · v2"
          }
        },
        {
          "title": "A ne likha",
          "clock": "20 ms",
          "say": "A: 100 ≥ 80. A likhte waqt kehta hai \"maine v2 dekha tha\". Store v2 par hi tha, toh <b>Withdrawn 80</b> jud gaya: v3, ₹20.",
          "nodes": {
            "a": {
              "tone": "ok",
              "badge": "likha"
            },
            "b": {
              "tone": "busy",
              "badge": "100 · v2"
            },
            "store": {
              "tone": "ok",
              "badge": "₹20"
            }
          },
          "vars": {
            "store": "₹20",
            "ver": "v3",
            "a": "likha",
            "b": "100 · v2"
          },
          "flows": [
            {
              "from": "a",
              "to": "store",
              "label": "−80 (v2 dekha)",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "B ki baari",
          "clock": "20 ms",
          "say": "B ne bhi ₹100 dekha tha. Video ke code mein append bina version ke hota hai: \"aakhir mein jod do\".",
          "nodes": {
            "a": {
              "tone": "idle",
              "badge": "done"
            },
            "b": {
              "tone": "slow",
              "badge": "100 · v2"
            },
            "store": {
              "tone": "ok",
              "badge": "₹20"
            }
          },
          "vars": {
            "store": "₹20",
            "ver": "v3",
            "a": "likha",
            "b": "100 · v2"
          },
          "ask": {
            "q": "B bina version ke Withdrawn 80 jod de, toh store mein kya hoga?",
            "choices": [
              "₹−60 — B ne purana ₹100 dekha tha, toh jaanch bhi purane balance par hui",
              "₹20 — store khud dekh lega ki balance kam hai aur B ka event rok dega",
              "₹100 — do events ek saath aaye, toh store dono events radd kar deta hai"
            ],
            "answer": 0,
            "hint": "Balance kaun jaanchta hai — store ya handler?",
            "explain": "Balance ki jaanch handler mein hui, purane ₹100 par. Store ko bas \"aakhir mein jodo\" kaha gaya, toh v4 ban gaya: 20 − 80 = −60. Lab (asli processes, 20 accounts, har account par do ₹80 ek saath): bina version ke 20 / 20 accounts −60 par.",
            "choiceExplanations": [
              "Balance ki jaanch handler mein hui, purane ₹100 par. Store ko bas \"aakhir mein jodo\" kaha gaya, toh v4 ban gaya: 20 − 80 = −60. Lab (asli processes, 20 accounts, har account par do ₹80 ek saath): bina version ke 20 / 20 accounts −60 par.",
              "Store balance nahi jaanchta; store sirf events jodta hai. Jaanch handler ka kaam thi — purane data par.",
              "Store ko koi takraav nahi dikha: version maanga hi nahi gaya. Dono events jud gaye."
            ]
          }
        },
        {
          "title": "Version ki shart",
          "clock": "20 ms",
          "say": "Ab pichhle pal par lauto (store v3, ₹20) aur doosra tareeka dekho: B ka bina-version append is raaste mein hua hi nahi. B likhte waqt kehta hai \"maine v2 dekha tha\". Store v3 par hai — likhna mana: <b>expected v2, stream v3 par</b>. Kuch nahi likha gaya.",
          "nodes": {
            "a": {
              "tone": "idle",
              "badge": "done"
            },
            "b": {
              "tone": "bad",
              "badge": "mana"
            },
            "store": {
              "tone": "ok",
              "badge": "₹20"
            }
          },
          "vars": {
            "store": "₹20",
            "ver": "v3",
            "a": "likha",
            "b": "v2 ✗"
          },
          "flows": [
            {
              "from": "b",
              "to": "store",
              "label": "v2 dekha ✗",
              "tone": "bad"
            }
          ]
        },
        {
          "title": "Dobara padho",
          "clock": "40 ms",
          "say": "B ne 20 ms par dobara padha: ₹20, v3. Doosra 20 ms ka kaam poora hua; 40 ms par 20 < 80 dekh ke command mana. Store ₹20 par, minus nahi. Lab: version ki shart ke saath 20 commands dobara padhe aur mana hue; 0 accounts minus mein.",
          "nodes": {
            "a": {
              "tone": "idle",
              "badge": "done"
            },
            "b": {
              "tone": "ok",
              "badge": "20 · v3"
            },
            "store": {
              "tone": "ok",
              "badge": "₹20"
            }
          },
          "vars": {
            "store": "₹20",
            "ver": "v3",
            "a": "likha",
            "b": "20 · v3 → mana"
          }
        }
      ],
      "lesson": "Jo version padh ke faisla kiya, likhte waqt wahi version maango (expected version / optimistic concurrency). Store aage badh gaya ho toh likhna mana — dobara padho, dobara faisla. Microsoft ke pattern page par: event stores \"reject an append if the stream changed since it was read\"."
    },
    {
      "type": "dryrun",
      "title": "📋 Store mein likha, notice board tak nahi pahuncha",
      "goal": "a1 = ₹100. Notice board (read model) par bhi ₹100 — projector ne store ko pos 2 tak padha (checkpoint 2). Ab ₹30 ka withdraw. Lab 50 ka ex0-slowmo --story dual.",
      "nodes": [
        {
          "id": "h",
          "icon": "🧑‍💼",
          "label": "handler",
          "x": 130,
          "y": 75
        },
        {
          "id": "store",
          "icon": "📒",
          "label": "event store",
          "x": 440,
          "y": 75
        },
        {
          "id": "proj",
          "icon": "🔁",
          "label": "projector",
          "x": 440,
          "y": 300
        },
        {
          "id": "board",
          "icon": "📋",
          "label": "read model",
          "x": 760,
          "y": 187
        }
      ],
      "edges": [
        {
          "from": "h",
          "to": "store"
        },
        {
          "from": "h",
          "to": "board"
        },
        {
          "from": "store",
          "to": "proj"
        },
        {
          "from": "proj",
          "to": "board"
        }
      ],
      "viz": {
        "w": 890,
        "h": 380
      },
      "vars": [
        {
          "id": "store",
          "label": "Store mein a1"
        },
        {
          "id": "board",
          "label": "Board par a1"
        },
        {
          "id": "cp",
          "label": "Checkpoint"
        }
      ],
      "steps": [
        {
          "title": "Shuru",
          "clock": "0 ms",
          "say": "Store aur board dono ₹100. Projector ka checkpoint 2: store ki pos 2 tak sab board par lag chuka.",
          "nodes": {
            "h": {
              "tone": "idle",
              "badge": ""
            },
            "store": {
              "tone": "ok",
              "badge": "₹100"
            },
            "proj": {
              "tone": "idle",
              "badge": "cp 2"
            },
            "board": {
              "tone": "ok",
              "badge": "₹100"
            }
          },
          "vars": {
            "store": "₹100",
            "board": "₹100",
            "cp": "2"
          }
        },
        {
          "title": "Store mein likha",
          "clock": "5 ms",
          "say": "Handler ne <b>Withdrawn 30</b> store mein likha (pos 3). Store: ₹70.",
          "nodes": {
            "h": {
              "tone": "busy",
              "badge": "−30"
            },
            "store": {
              "tone": "ok",
              "badge": "₹70"
            },
            "proj": {
              "tone": "idle",
              "badge": "cp 2"
            },
            "board": {
              "tone": "slow",
              "badge": "₹100"
            }
          },
          "vars": {
            "store": "₹70",
            "board": "₹100",
            "cp": "2"
          },
          "flows": [
            {
              "from": "h",
              "to": "store",
              "label": "pos 3: −30",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "Bhejne se pehle crash",
          "clock": "6 ms",
          "say": "Video ka tareeka: ab handler event listener ko bhejega, aur listener board badlega. Par bhejne se pehle handler crash. Client ko error mila.",
          "nodes": {
            "h": {
              "tone": "bad",
              "badge": "crash"
            },
            "store": {
              "tone": "ok",
              "badge": "₹70"
            },
            "proj": {
              "tone": "idle",
              "badge": "cp 2"
            },
            "board": {
              "tone": "slow",
              "badge": "₹100"
            }
          },
          "vars": {
            "store": "₹70",
            "board": "₹100",
            "cp": "2"
          },
          "ask": {
            "q": "Listener sirf handler ka bheja event lagata hai; store nahi padhta. Board ₹70 kab dikhayega?",
            "choices": [
              "Kabhi nahi — event store mein hai, par listener tak kabhi nahi jaayega",
              "Handler restart hote hi — restart par handler bacha hua event bhejta hai",
              "50 ms baad — listener har 50 ms par handler se naye events maangta hai"
            ],
            "answer": 0,
            "hint": "Kisi ne likh ke rakha tha ki kaunsa event bhejna baaki hai?",
            "explain": "Store mein likhna aur listener ko bhejna do alag kaam the. Beech mein crash hua toh event store mein hai, board par kabhi nahi. Lab (asli crash): a4 ka store 70, board 100 — aur client ko error mila, jabki paisa kat chuka tha.",
            "choiceExplanations": [
              "Store mein likhna aur listener ko bhejna do alag kaam the. Beech mein crash hua toh event store mein hai, board par kabhi nahi. Lab (asli crash): a4 ka store 70, board 100 — aur client ko error mila, jabki paisa kat chuka tha.",
              "Handler ko yaad hi nahi ki kya bhejna baaki tha; bhejne wali baat kahin likhi nahi gayi.",
              "Listener store nahi padhta; handler ka bheja event hi board par lagata hai."
            ]
          }
        },
        {
          "title": "Projector khud padhe",
          "clock": "50 ms",
          "say": "Doosra tareeka: projector khud store padhta hai. Checkpoint 2 ke baad pos 3 mila, board par −30 lagaya, checkpoint 3. Board ₹70.",
          "nodes": {
            "h": {
              "tone": "bad",
              "badge": "crash"
            },
            "store": {
              "tone": "ok",
              "badge": "₹70"
            },
            "proj": {
              "tone": "ok",
              "badge": "cp 3"
            },
            "board": {
              "tone": "ok",
              "badge": "₹70"
            }
          },
          "vars": {
            "store": "₹70",
            "board": "₹70",
            "cp": "3"
          },
          "flows": [
            {
              "from": "store",
              "to": "proj",
              "label": "pos 3",
              "tone": "acc"
            },
            {
              "from": "proj",
              "to": "board",
              "label": "−30",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "Checkpoint kab likho?",
          "clock": "50 ms",
          "say": "Projector board badalta hai aur checkpoint aage badhata hai. Socho: board ka −30 commit ho gaya, aur checkpoint likhne se pehle projector crash.",
          "nodes": {
            "h": {
              "tone": "idle",
              "badge": ""
            },
            "store": {
              "tone": "ok",
              "badge": "₹70"
            },
            "proj": {
              "tone": "bad",
              "badge": "crash"
            },
            "board": {
              "tone": "ok",
              "badge": "₹70"
            }
          },
          "vars": {
            "store": "₹70",
            "board": "₹70",
            "cp": "2 (abhi)"
          },
          "ask": {
            "q": "Board aur checkpoint alag transactions mein the. Restart par kya hoga?",
            "choices": [
              "Pos 3 dobara lagega — board ₹40 dikhayega, jabki store ₹70 kehta hai",
              "Kuch nahi — projector ko yaad hai ki pos 3 board par lag chuka tha",
              "Board ₹100 par lautega — crash par board ka badlaav mit jaata hai"
            ],
            "answer": 0,
            "hint": "Projector ki yaad kahan likhi hai?",
            "explain": "Checkpoint abhi 2 par tha, toh restart par pos 3 phir aaya aur −30 dobara laga: 70 − 30 = 40. Lab (split mode, asli crash): a4 board 40, store 70. Board aur checkpoint ek hi transaction mein ho (together): crash par dono wapas, lab mein 0 galat.",
            "choiceExplanations": [
              "Checkpoint abhi 2 par tha, toh restart par pos 3 phir aaya aur −30 dobara laga: 70 − 30 = 40. Lab (split mode, asli crash): a4 board 40, store 70. Board aur checkpoint ek hi transaction mein ho (together): crash par dono wapas, lab mein 0 galat.",
              "Projector ki yaad checkpoint hi hai, aur checkpoint 2 par atka tha.",
              "Board ka −30 commit ho chuka tha; crash commit hua badlaav wapas nahi karta."
            ]
          }
        }
      ],
      "lesson": "Read model store se banao: projector apne checkpoint ke baad ke events padhe, aur board + checkpoint ek transaction mein likhe. \"Store mein likho aur saath hi queue ko bhejo\" do alag writes hain — beech ka crash event ko read model se hamesha ke liye chhoot deta hai (ya outbox lagao)."
    },
    {
      "type": "cards",
      "title": "⚡ Teen aur sawaal: lambi passbook, purana roop, dheema board",
      "goal": "Passbook lambi ho jaaye, event ka roop badal jaaye, ya user ko apna abhi ka likha turant dekhna ho — tab kya?",
      "lesson": "Snapshot padhna tez karta hai par events ki jagah nahi leta; upcaster purane events ko padhte waqt naya roop deta hai; board events ke peeche chalta hai, toh apna likha padhne ke liye pos tak ruko.",
      "steps": [
        {
          "title": "1. Lambi passbook",
          "say": "Ek account ke 1,00,350 events. Har command par shuru se jodna: lab mein 137–144 ms. Har 1,000 events par haalat ki photo (<b>snapshot</b>): photo v1,00,000 + baaki 350 events — 0.5 ms. Dono ka balance 2,50,880.",
          "ask": {
            "q": "Snapshot ban gaya. Kya ab purane events mita sakte ho?",
            "choices": [
              "Nahi — snapshot sirf tez padhne ke liye hai; sach ka source events hi hain",
              "Haan — photo mein poori haalat hai, toh purane events ab bekaar bojh hain",
              "Haan — bas tab, jab snapshot har 10 events jitni jaldi-jaldi liya gaya ho"
            ],
            "answer": 0,
            "hint": "Audit aur purani tareekh ka jawab kahan se aata hai?",
            "explain": "Microsoft: \"Snapshots are an optimization, not a replacement for the eventstream.\" Audit, purani tareekh ki haalat aur naye read models — sab events se bante hain. Fold ka code badla toh purane snapshots bhi events se dobara banane padte hain.",
            "choiceExplanations": [
              "Microsoft: \"Snapshots are an optimization, not a replacement for the eventstream.\" Audit, purani tareekh ki haalat aur naye read models — sab events se bante hain. Fold ka code badla toh purane snapshots bhi events se dobara banane padte hain.",
              "Photo aaj ki haalat hai, itihaas nahi. Audit aur purani tareekh ka jawab events se aata hai.",
              "Snapshot kitni baar bhi lo, sach ka source events hi rehte hain."
            ]
          }
        },
        {
          "title": "2. Purana roop",
          "say": "Pichhle saal deposit event ka roop tha <code>MoneyAdded {amt}</code> (schema 1). Ab <code>Deposited {amount}</code> (schema 2). Purane events badal nahi sakte.",
          "ask": {
            "q": "Naya code sirf Deposited samajhta hai. Purane khaate ka balance sahi kaise aaye?",
            "choices": [
              "Padhte waqt purane event ko naye roop mein badlo (upcaster); DB mein event wahi rahe",
              "Ek baar UPDATE chala ke saare MoneyAdded events ko Deposited mein badal do",
              "Purane MoneyAdded events chhod do — naye events se balance kaafi sahi aayega"
            ],
            "answer": 0,
            "hint": "Event data badalna allowed hai?",
            "explain": "Padhte waqt badalna = <b>upcasting</b>. Lab: 2 purane events ke saath bina upcaster balance 50, upcaster ke saath 130 — aur events table ka hash pehle aur baad wahi. Microsoft: \"you should never update the event data\".",
            "choiceExplanations": [
              "Padhte waqt badalna = <b>upcasting</b>. Lab: 2 purane events ke saath bina upcaster balance 50, upcaster ke saath 130 — aur events table ka hash pehle aur baad wahi. Microsoft: \"you should never update the event data\".",
              "Event data badalna mana hai: audit aur purana roop padh chuke consumers, dono ka bharosa toot-ta hai.",
              "Lab: purane events chhode toh balance 130 ki jagah 50 — ₹80 gayab."
            ]
          }
        },
        {
          "title": "3. Dheema board",
          "say": "Command ke turant baad board padha: lab mein 10 / 10 baar purana balance (projector har 50 ms par padhta hai). Command apna pos lautaye, aur read kahe \"board pos tak pahunche tab jawab do\": 0 / 10 purana, intezaar 31–48 ms. 2 s mein bhi na pahunche toh read \"abhi taiyaar nahi\" ka error deta hai — purana balance safal jawab ki tarah nahi.",
          "ask": {
            "q": "User ne ₹30 nikaale aur turant app mein purana ₹100 dikha. Sabse seedha sudhaar?",
            "choices": [
              "Command ka pos lautao; read us pos tak board pahunchne ka intezaar kare",
              "Handler pehle store commit kare, phir alag transaction mein board likhe — board peeche nahi rahega",
              "Projector ko har 5 ms par chalao — tab purana balance kabhi nahi dikhega"
            ],
            "answer": 0,
            "hint": "Board kis cheez ke peeche chalta hai?",
            "explain": "Board events ke peeche chalta hai (eventual consistency). Jis user ne abhi likha, us user ka read pos tak ruke — read-your-writes. Lab: minPos ke saath 0 / 10 purana, 31–48 ms ka intezaar.",
            "choiceExplanations": [
              "Board events ke peeche chalta hai (eventual consistency). Jis user ne abhi likha, us user ka read pos tak ruke — read-your-writes. Lab: minPos ke saath 0 / 10 purana, 31–48 ms ka intezaar.",
              "Do alag commits ke beech crash hua toh board ka badlaav chhoot sakta hai (lab: a4 store 70, board 100). Dono ek hi DB transaction mein likhna alag design hai; lab ka projector async hai, isliye read pos tak rukta hai.",
              "Poll tez karne se gap chhota hota hai, khatam nahi. Command ke turant baad wala read phir bhi purana mil sakta hai."
            ]
          }
        },
        {
          "title": "4. Naam",
          "say": "Likhte waqt padha version maangna: <b>optimistic concurrency / expected version</b>. Events se bana padhne wala model: <b>projection / read model</b> — likhne aur padhne ke alag model rakhna <b>CQRS</b> hai, aur board padhne wala model hai. Haalat ki photo: <b>snapshot</b>. Padhte waqt purane roop ko naya banana: <b>upcasting</b>."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Asli processes: do handlers, phir crash ke saath read model",
      "project": "50-event-sourcing",
      "exercise": "ex2-projection",
      "goal": "Pehle 20 accounts par do handler processes ek saath. Phir store vs read model: video jaisa publish, aur projector ke do tareeke.",
      "why": "Node 24+ chahiye. Tool handler, listener aur projector processes khud chalata, crash par dobara chalata aur band karta hai. Ginti teeno runs mein wahi rahi; sirf read ke intezaar ke ms badle (31–48 ms).",
      "steps": [
        {
          "text": "Lab folder se: do handlers, 20 accounts.",
          "cmd": "cd docker-labs/50-event-sourcing && npm start -- ex1-race",
          "expect": "any      withdraw-ok=40/40 mana=0 dobara-padha=0 minus-balance=20/20 aakhri-balance=[-60] events=80\nexpected withdraw-ok=20/40 mana=20 dobara-padha=20 minus-balance=0/20 aakhri-balance=[20] events=60"
        },
        {
          "text": "Store aur read model, asli crash ke saath.",
          "cmd": "npm start -- ex2-projection",
          "expect": "dual     command-ok=9 client-ko-error=1 crash=1 store≠read-model=1 [a4 store=70 read=100]\ntogether command-ok=10 client-ko-error=0 crash=1 store≠read-model=0\nsplit    command-ok=10 client-ko-error=0 crash=1 store≠read-model=1 [a4 store=70 read=40]\nread     command-ok=10 turant-padha-purana=10/10 minPos-ke-saath-purana=0/10 intezaar=31–48 ms galat=0"
        }
      ],
      "observe": {
        "q": "split mode mein a4 ka read model 40, store 70. Ek command, ek crash — ₹30 do baar kaise kata?",
        "choices": [
          "Board par −30 commit hua, checkpoint nahi; restart par wahi event dobara laga",
          "Handler ne crash ke baad wahi command dobara chalaya aur store mein do events bane",
          "Projector ne do alag pos ko a4 ka maan liya, kyunki store mein pos kram mein nahi the"
        ],
        "answer": 0,
        "hint": "Store kya kehta hai — galti store mein hai ya read model mein?",
        "explain": "Split mode mein board ka badlaav aur checkpoint alag transactions mein the. Crash beech mein hua: board −30 ho chuka, checkpoint pichhla. Restart par wahi pos 24 dobara aaya. Store sahi tha (70) — sirf read model galat. Together mode mein crash par dono wapas: 0 galat.",
        "choiceExplanations": [
          "Split mode mein board ka badlaav aur checkpoint alag transactions mein the. Crash beech mein hua: board −30 ho chuka, checkpoint pichhla. Restart par wahi pos 24 dobara aaya. Store sahi tha (70) — sirf read model galat. Together mode mein crash par dono wapas: 0 galat.",
          "Store mein a4 ka ek hi Withdrawn hai — store 70 kehta hai. Galti read model mein hai.",
          "Pos kram mein the; pos 24 store mein ek hi baar hai. Projector ne pos 24 do baar lagaya."
        ]
      },
      "lesson": "Do commands, ek purana version: shart ke bina dono jud jaate hain. Read model store se bane, aur projector ka checkpoint board ke saath ek transaction mein — warna crash par event chhoot-ta ya dobara lagta hai."
    }
  ],
  "interview": {
    "title": "Interview Round — likhna aur padhna sahi rakho",
    "instructions": "Pehle socho: faisla kis version par hua, aur event read model tak kaise pahuncha? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Ek SKU ke stock events ek hi stream mein hain. Do tabs se ek saath last item kharidne ka command aaya. Dono handlers ne stock 1 aur stream v7 padha, phir bina expected version ke isi stock stream mein StockReserved joda. Do reservations ban gaye. Kya badloge?",
        "choices": [
          "Stock stream par expected version 7 maango; conflict par stock dobara padh ke faisla karo",
          "Stock ki jaanch handler se hata ke frontend ke button par laga do — button do baar dabega hi nahi",
          "Stock read model se padho — read model store se hamesha zyada taaza aur sahi rehta hai",
          "Har StockReserved ke baad 1 second ruko, phir hi agla reservation command lo"
        ],
        "answer": 0,
        "explain": "Dono handlers ne stock stream ka v7 (stock 1) padha — faisla purane data par hua. Append mein expected version 7 do: pehla reservation v8 banata hai, doosre ka likhna mana, doosra handler stream dobara padhta hai aur stock 0 dekh ke mana karta hai. Shart tabhi bachati hai jab stock ka niyam aur append ek hi stream mein hon. Lab: bina version 20 / 20 accounts minus mein, version ke saath 0.",
        "choiceExplanations": [
          "Dono handlers ne stock stream ka v7 (stock 1) padha — faisla purane data par hua. Append mein expected version 7 do: pehla reservation v8 banata hai, doosre ka likhna mana, doosra handler stream dobara padhta hai aur stock 0 dekh ke mana karta hai. Shart tabhi bachati hai jab stock ka niyam aur append ek hi stream mein hon. Lab: bina version 20 / 20 accounts minus mein, version ke saath 0.",
          "Frontend ko doosre tab ka pata nahi; jaanch phir bhi purane data par hogi.",
          "Read model store ke peeche chalta hai — store se purana ho sakta hai, taaza nahi.",
          "Rukne se race ka gap badalta hai, khatam nahi hota; do handlers phir bhi ek saath padh sakte hain."
        ]
      },
      {
        "q": "Team ka design: handler event store mein likhta hai, phir usi request mein Kafka par publish karta hai; read models Kafka se bante hain. Kabhi-kabhi read model mein ek order gayab rehta hai. Wajah aur ilaaj?",
        "choices": [
          "Store aur Kafka do alag writes; crash beech mein hua toh event chhoota. Store se padho, ya outbox",
          "Kafka ne event kho diya; Kafka hata ke RabbitMQ lagao, RabbitMQ mein koi event nahi khota",
          "Read model ka DB dheema hai; read model ke liye koi tez DB lagao, tab order bhi dikhega",
          "Pehle Kafka par publish karo, phir store mein likho — tab koi bhi event nahi chhootega"
        ],
        "answer": 0,
        "explain": "Store mein likhna aur Kafka par bhejna do alag writes hain: beech mein crash hua toh event store mein hai, Kafka par nahi — read model mein kabhi nahi aayega. Ilaaj: projector/publisher store ko checkpoint ke saath padhe (catch-up), ya outbox. Lab: aisa crash = a4 store 70, read model 100, aur client ko error.",
        "choiceExplanations": [
          "Store mein likhna aur Kafka par bhejna do alag writes hain: beech mein crash hua toh event store mein hai, Kafka par nahi — read model mein kabhi nahi aayega. Ilaaj: projector/publisher store ko checkpoint ke saath padhe (catch-up), ya outbox. Lab: aisa crash = a4 store 70, read model 100, aur client ko error.",
          "Broker badalne se do writes ka gap nahi jaata. Event bheja hi nahi gaya tha.",
          "Dheema DB der karta hai, event gayab nahi karta. Yahan event read model tak pahuncha hi nahi.",
          "Ulta kram ulti dikkat deta hai: publish hua aur store mein likhne se pehle crash — read model mein aisa order jo store mein hai hi nahi."
        ]
      }
    ]
  },
  "success": [
    "Expected version se do commands ka takraav rok sakte ho",
    "Read model ko checkpoint ke saath store se bana sakte ho",
    "Snapshot, upcasting aur read-your-writes kab chahiye, bata sakte ho"
  ],
  "cards": [
    {
      "front": "Expected version kya rokta hai?",
      "back": "Do commands ne ek hi purana version padha — doosre ka likhna mana, dobara padho. Lab: bina shart 20 / 20 minus, shart ke saath 0."
    },
    {
      "front": "Store aur queue dono mein likhna — dikkat?",
      "back": "Do alag writes: beech ka crash event ko read model se chhoot deta hai. Projector store se checkpoint ke saath padhe, ya outbox."
    },
    {
      "front": "Snapshot events ki jagah le sakta hai?",
      "back": "Nahi. Snapshot sirf tez padhne ke liye; sach ka source events. Lab: 137–144 ms vs 0.5 ms."
    },
    {
      "front": "Upcasting?",
      "back": "Padhte waqt purane event ko naye roop mein badlo; DB mein event wahi. Lab: bina upcaster 50, saath 130."
    }
  ]
}
]);
})();
