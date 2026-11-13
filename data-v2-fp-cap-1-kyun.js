/* First Principles — FAANG Senior Engineer.
   Source credit: CAP Theorem & PACELC (Ub9yZucpwC0), numbered video 8/15.
   Evidence: docker-labs/58-cap/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "ny", "icon": "🏧", "label": "ATM (badi taraf)", "x": 150, "y": 70}, {"id": "big", "icon": "🗄️", "label": "Nodes 1, 2, 3", "x": 450, "y": 70}, {"id": "cut", "icon": "✂️", "label": "Network toota", "x": 450, "y": 190}, {"id": "small", "icon": "🗄️", "label": "Nodes 4, 5", "x": 750, "y": 310}, {"id": "la", "icon": "🏧", "label": "ATM (chhoti taraf)", "x": 450, "y": 310}];
const EDGES = [{"from": "ny", "to": "big"}, {"from": "big", "to": "cut"}, {"from": "cut", "to": "small"}, {"from": "la", "to": "small"}];
VISUALS["fp-cap-kyun"] = { t: "Network 3 | 2 mein toota. Chhoti taraf: mana karo (CP) ya apni copy se do (AP)?", html: SD.viz.svg(HERO, EDGES, { nodes: { ny: {tone:'ok',badge:'diya'}, big: {tone:'ok',badge:'3 = quorum'}, cut: {tone:'bad',badge:'toota'}, small: {tone:'busy',badge:'?'}, la: {tone:'acc',badge:'?'} } }, {w:900,h:380}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-cap-kyun",
  "icon": "🏧",
  "group": "🔀 CAP & PACELC",
  "title": "CAP 1 · Kyun — do ATM, ek balance",
  "badge": "Partition Ka Faislakaar",
  "objectives": [
    "Partition mein \"mana karo\" (CP) aur \"purani copy se jawab do\" (AP) ka asli matlab",
    "AP mein balance likhna vs entries likhna: galti chhupi vs dikhi",
    "Atka node aur mara node bahar se ek jaise kyun?"
  ],
  "lesson": [
    "<h3>📒 Do bahi-khaate, beech mein deewar</h3><p>Dukaan ke do counter, dono ke paas ek hi grahak ka bahi-khaata. Beech ka darwaza band ho gaya. Grahak dono counters par ek saath udhaar maangta hai. Counter wala ya toh kahe \"pehle doosre counter se poochhunga\" (mana), ya apne khaate se de de (jawab) — aur baad mein khaate milaaye.</p><p>Distributed database mein network toot'ta hai toh har node ke saamne counter wale jaisa sawaal hota hai. Aaj naapte hain: mana karne ki keemat, aur jawab dene ki keemat.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "🏧 Do ATM, ek balance — network beech se toota",
      "goal": "Lab 58 ex1 (model, seeded). Bank ke 5 nodes, network {1,2,3} | {4,5} mein toota. 1,000 accounts, har ek mein ₹100. Har account par dono taraf ka ek-ek ATM ek saath ₹10–100 nikaalta hai. Chaar niyam aazmaate hain.",
      "nodes": [
        {
          "id": "ny",
          "icon": "🏧",
          "label": "ATM (badi taraf)",
          "x": 150,
          "y": 70
        },
        {
          "id": "big",
          "icon": "🗄️",
          "label": "Nodes 1, 2, 3",
          "x": 450,
          "y": 70
        },
        {
          "id": "cut",
          "icon": "✂️",
          "label": "Network toota",
          "x": 450,
          "y": 190
        },
        {
          "id": "small",
          "icon": "🗄️",
          "label": "Nodes 4, 5",
          "x": 750,
          "y": 310
        },
        {
          "id": "la",
          "icon": "🏧",
          "label": "ATM (chhoti taraf)",
          "x": 450,
          "y": 310
        }
      ],
      "edges": [
        {
          "from": "ny",
          "to": "big"
        },
        {
          "from": "big",
          "to": "cut"
        },
        {
          "from": "cut",
          "to": "small"
        },
        {
          "from": "la",
          "to": "small"
        }
      ],
      "viz": {
        "w": 900,
        "h": 380
      },
      "vars": [
        {
          "id": "ok",
          "label": "Withdraw hua (badi / chhoti)"
        },
        {
          "id": "paid",
          "label": "Diya ₹"
        },
        {
          "id": "bad",
          "label": "Galti"
        }
      ],
      "steps": [
        {
          "title": "Sab theek",
          "clock": "shuru",
          "say": "Network theek: har withdrawal paanchon nodes par likha jaata hai. Ek account, ek sach.",
          "nodes": {
            "ny": {
              "tone": "ok",
              "badge": ""
            },
            "big": {
              "tone": "ok",
              "badge": "₹100"
            },
            "cut": {
              "tone": "idle",
              "badge": "juda hua"
            },
            "small": {
              "tone": "ok",
              "badge": "₹100"
            },
            "la": {
              "tone": "ok",
              "badge": ""
            }
          },
          "vars": {
            "ok": "—",
            "paid": "—",
            "bad": "—"
          }
        },
        {
          "title": "Network toota",
          "clock": "split",
          "say": "Switch mara: nodes 1–3 aur 4–5 ek doosre ko nahi dekh sakte. Dono ATMs ke saamne customer khada hai.",
          "nodes": {
            "ny": {
              "tone": "acc",
              "badge": "₹70 chahiye"
            },
            "big": {
              "tone": "busy",
              "badge": "₹100 dikhta"
            },
            "cut": {
              "tone": "bad",
              "badge": "toota"
            },
            "small": {
              "tone": "busy",
              "badge": "₹100 dikhta"
            },
            "la": {
              "tone": "acc",
              "badge": "₹60 chahiye"
            }
          },
          "vars": {
            "ok": "?",
            "paid": "?",
            "bad": "?"
          },
          "ask": {
            "q": "Chhoti taraf ke ATM ke paas do raaste hain. Kaunsa raasta CP hai?",
            "choices": [
              "Mana kar do — 5 mein se 3 nodes tak pahunch nahi, toh pakka sach pata nahi",
              "Paisa de do — apni copy mein ₹100 hai, jodte waqt sab theek ho jaayega",
              "Apne aap badi taraf ka leader ban jao, phir paisa de do"
            ],
            "answer": 0,
            "hint": "CP mein C (har read sabse naya sach) ya A (har request ka jawab) — kaunsa bachaate hain?",
            "explain": "CP = partition mein consistency bachao: majority (3 of 5) na bana sakne wali taraf likhne aur pakka padhne se mana karti hai. Lab: chhoti taraf ke 1,000 withdrawals aur 768 balance checks mana. Badi taraf chalti rahi — poora system band nahi hua.",
            "choiceExplanations": [
              "CP = partition mein consistency bachao: majority (3 of 5) na bana sakne wali taraf likhne aur pakka padhne se mana karti hai. Lab: chhoti taraf ke 1,000 withdrawals aur 768 balance checks mana. Badi taraf chalti rahi — poora system band nahi hua.",
              "Apni copy se paisa dena AP hai: jawab mila, par sach ki guarantee nahi.",
              "2 nodes majority (3) nahi bana sakte; khud leader banna split brain hai."
            ]
          }
        },
        {
          "title": "CP ka nateeja",
          "clock": "CP",
          "say": "Niyam: commit ke liye 3 of 5 nodes. Badi taraf ke 1,000 withdrawals hue, chhoti taraf ke 1,000 mana.",
          "nodes": {
            "ny": {
              "tone": "ok",
              "badge": "diya"
            },
            "big": {
              "tone": "ok",
              "badge": "3 nodes = quorum"
            },
            "cut": {
              "tone": "bad",
              "badge": "toota"
            },
            "small": {
              "tone": "bad",
              "badge": "mana"
            },
            "la": {
              "tone": "bad",
              "badge": "\"service band\""
            }
          },
          "vars": {
            "ok": "1,000 / 0",
            "paid": "56,200",
            "bad": "0 zyada diya"
          }
        },
        {
          "title": "AP + LWW",
          "clock": "AP LWW",
          "say": "Ab dono taraf apni copy se paisa deti hain aur apna naya <b>balance</b> likhti hain. Network judne par last-write-wins: baad wala balance jeeta.",
          "nodes": {
            "ny": {
              "tone": "ok",
              "badge": "diya"
            },
            "big": {
              "tone": "ok",
              "badge": "₹30 likha"
            },
            "cut": {
              "tone": "idle",
              "badge": "juda"
            },
            "small": {
              "tone": "ok",
              "badge": "₹40 likha"
            },
            "la": {
              "tone": "ok",
              "badge": "diya"
            }
          },
          "vars": {
            "ok": "1,000 / 1,000",
            "paid": "1,11,620",
            "bad": "56,200 kitaab se gayab"
          },
          "ask": {
            "q": "Badi taraf ₹70 dekar balance ₹30 likhti hai, chhoti taraf ₹60 dekar ₹40. Model mein chhoti taraf ka timestamp bada hai. LWW ke baad kitaab?",
            "choices": [
              "₹40 — sirf chhoti taraf ka withdrawal dikhta; ₹70 gayab",
              "−₹30 — dono withdrawals jud gaye, account minus mein dikhta hai",
              "₹100 — dono writes takraaye, toh database ne dono hata diye"
            ],
            "answer": 0,
            "hint": "Dono taraf ne kya likha tha: withdrawal, ya balance?",
            "explain": "Dono taraf ne poora balance likha (₹30 aur ₹40). LWW ne ek balance rakha, doosra mitaya. ₹130 diye, kitaab mein sirf ₹60. Lab: ₹56,200 ke withdrawals kitaab se gayab. Galti chupchaap hui.",
            "choiceExplanations": [
              "Dono taraf ne poora balance likha (₹30 aur ₹40). LWW ne ek balance rakha, doosra mitaya. ₹130 diye, kitaab mein sirf ₹60. Lab: ₹56,200 ke withdrawals kitaab se gayab. Galti chupchaap hui.",
              "Withdrawals jodna ledger ka kaam hai; LWW sirf ek value rakhta hai.",
              "LWW dono writes reject karke ₹100 par wapas nahi jaata; bada timestamp wala balance rakhta hai."
            ]
          }
        },
        {
          "title": "AP + ledger",
          "clock": "ledger",
          "say": "Balance ki jagah har withdrawal ek entry (ledger, CRDT jaisa). Jodne par dono entries rahti hain.",
          "nodes": {
            "ny": {
              "tone": "ok",
              "badge": "diya"
            },
            "big": {
              "tone": "ok",
              "badge": "−₹70 entry"
            },
            "cut": {
              "tone": "idle",
              "badge": "juda"
            },
            "small": {
              "tone": "ok",
              "badge": "−₹60 entry"
            },
            "la": {
              "tone": "ok",
              "badge": "diya"
            }
          },
          "vars": {
            "ok": "1,000 / 1,000",
            "paid": "1,11,620",
            "bad": "579 accounts minus"
          }
        },
        {
          "title": "AP + offline ₹20",
          "clock": "limit",
          "say": "Chhoti taraf sirf ₹20 tak deti hai (asli ATM networks ke stand-in niyam jaisa). Badi taraf normal. 🌐 Distributed track ke CAP aur Eventual Consistency levels mein withdrawal ka niyam hai \"balance se zyada kabhi nahi\". Offline ₹20 model mein niyam alag hai: seemit overdraft manzoor, baad mein wasooli.",
          "nodes": {
            "ny": {
              "tone": "ok",
              "badge": "diya"
            },
            "big": {
              "tone": "ok",
              "badge": "normal"
            },
            "cut": {
              "tone": "bad",
              "badge": "toota"
            },
            "small": {
              "tone": "busy",
              "badge": "≤ ₹20"
            },
            "la": {
              "tone": "acc",
              "badge": "₹60 mana"
            }
          },
          "vars": {
            "ok": "1,000 / 194",
            "paid": "59,170",
            "bad": "₹530 zyada (40 accounts)"
          },
          "ask": {
            "q": "Offline ₹20 ki seema se bank ko kya mila?",
            "choices": [
              "Kuch withdrawals chalte rahe, aur nuksaan ki seema tay — ₹22,840 ki jagah ₹530",
              "Poori consistency — offline seema ke saath kabhi zyada paisa nahi jaata",
              "Poori availability — seema ke baad bhi saare 1,000 withdrawals hue"
            ],
            "answer": 0,
            "hint": "Chhoti taraf ke kitne withdrawals hue, aur kitna zyada paisa gaya?",
            "explain": "Seema ek beech ka raasta hai: 194 chhote withdrawals chhoti taraf bhi chale, 806 mana hue. Zyada diya paisa ₹22,840 se ghat kar ₹530 (40 accounts). Asli banks hamesha CP nahi — seemit risk lekar service chalate hain aur baad mein hisaab milaate hain (Brewer 2012 ka ATM udaharan).",
            "choiceExplanations": [
              "Seema ek beech ka raasta hai: 194 chhote withdrawals chhoti taraf bhi chale, 806 mana hue. Zyada diya paisa ₹22,840 se ghat kar ₹530 (40 accounts). Asli banks hamesha CP nahi — seemit risk lekar service chalate hain aur baad mein hisaab milaate hain (Brewer 2012 ka ATM udaharan).",
              "Lab mein 40 accounts mein phir bhi ₹530 zyada gaya; consistency poori nahi.",
              "Chhoti taraf 194 withdrawals hue, 806 seema ki wajah se mana hue."
            ]
          }
        }
      ],
      "lesson": "Partition mein har operation ke liye chunna padta hai: mana karo (CP) ya apni copy se jawab do (AP). AP mein kya likhte ho (balance ya entries) tay karta hai ki galti chhupegi ya dikhegi. Beech ke raaste bhi hain: seemit risk."
    },
    {
      "type": "cards",
      "title": "🐢 Atka hua ya mara hua?",
      "goal": "Lab 58 ex0 (asli): ek worker thread har 20 ms ke ping ka jawab deta hai. Teen detectors (timeout 100 ms, 500 ms, 3 s). Kahani 1: node 2 s atka (GC pause jaisa), phir theek. Kahani 2: node sach mein band.",
      "lesson": "Bahar se atka hua node aur mara hua node ek jaise dikhte hain: jawab aana band. Timeout sirf shak deta hai. Chhota timeout = jaldi failover par jhoote alarm; lamba timeout = kam jhoote alarm par asli crash par der.",
      "steps": [
        {
          "title": "1. Teen detectors, do kahaniyan",
          "say": "Atka hua node (zinda tha): 100 ms detector ne ~583–586 ms par \"mara\" kaha, 500 ms wale ne ~986–989 ms par — dono <b>jhoote</b> alarm. 3 s wala chup raha (sahi). Mara hua node: 100 ms detector ne 86–105 ms mein pakda, 500 ms ne 486–494 ms, 3 s ne ~3 s mein.",
          "ask": {
            "q": "Team ne failover timeout 3 s se 100 ms kiya taaki failover tez ho. Kya khatra hai?",
            "choices": [
              "2 s GC pause wala zinda node bhi \"mara\" mana jaayega; bina zaroorat failover",
              "Kuch nahi — chhota timeout sirf tab alarm deta hai jab node sach mein mara ho",
              "Asli crash ab pakda hi nahi jaayega, kyunki 100 ms bahut chhota samay hai"
            ],
            "answer": 0,
            "hint": "Kahani 1 mein 100 ms detector ne kya kaha?",
            "explain": "Timeout jawab na aane ko ginta hai, maut ko nahi. Lab mein 100 ms detector ne atke hue zinda node ko ~583–586 ms par mara kaha. Failover ho gaya toh purana leader jaag kar likh sakta hai (split brain — level 4). Jaldi pakadna aur jhoote alarm se bachna, dono ek saath nahi milte.",
            "choiceExplanations": [
              "Timeout jawab na aane ko ginta hai, maut ko nahi. Lab mein 100 ms detector ne atke hue zinda node ko ~583–586 ms par mara kaha. Failover ho gaya toh purana leader jaag kar likh sakta hai (split brain — level 4). Jaldi pakadna aur jhoote alarm se bachna, dono ek saath nahi milte.",
              "Lab ki kahani 1 mein node zinda tha, phir bhi 100 ms detector ne alarm diya.",
              "Asli crash 100 ms detector ne 86–105 ms mein pakda."
            ]
          }
        },
        {
          "title": "2. Partition = timeout se zyada der",
          "say": "Node A ko B ka jawab timeout ke andar nahi mila. A ke liye network toota hua hai — chahe cable kati ho, chahe B GC mein atka ho. Brewer (2012) ka operational point: timeout par system ko faisla lena padta hai (request rad karo, ya inconsistency ka risk lekar aage badho)."
        },
        {
          "title": "3. Jhoota alarm ho hi jaaye toh?",
          "say": "Koi fixed timeout har haalat mein crash ka pakka saboot nahi deta, isliye failover ko jhoote alarm ke liye taiyaar rakho: naya leader sirf <b>majority</b> ki haan se bane, aur purane leader ke writes storage par <b>fencing token</b> se ruken (level 4). Tab jaaga hua purana leader nuksaan nahi kar paata."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Ek atka node, ek toota network",
      "project": "58-cap",
      "exercise": "ex1-partition",
      "goal": "ex0: asli worker thread, 3 failure detectors. ex1: 5 nodes, 3 | 2 split, ATM withdrawals par chaar niyam (seeded model).",
      "why": "Node 24+ chahiye. ex0 ka samay thoda hilega; ex1 ki ginti har run same.",
      "steps": [
        {
          "text": "Lab folder se: atka vs mara.",
          "cmd": "cd docker-labs/58-cap && npm start -- ex0-slow-vs-dead",
          "expect": "Ping har 20 ms. Node t = 501 ms par atka; wapas jawab t = 2503 ms par.\n\ntimeout    Kahani 1: 2 s ka pause (node ZINDA tha)          Kahani 2: node sach mein band\n  100 ms   \"mara\" kaha t = 585 ms par (JHOOTA alarm)       pakda 105 ms baad\n  500 ms   \"mara\" kaha t = 989 ms par (JHOOTA alarm)       pakda 486 ms baad\n 3000 ms   koi alarm nahi (sahi)                           pakda 2988 ms baad\n\nBahar se dono kahaniyan pehle ek jaisi dikhti hain: pong aana band. Chhota timeout = jaldi pakdo, par zinda\nnode ko bhi \"mara\" bolo. Lamba timeout = jhoota alarm nahi, par sach mein mara node der se pakda."
        },
        {
          "text": "Partition mein ATM.",
          "cmd": "npm start -- ex1-partition",
          "expect": "niyam              withdraw OK (maj/min)   mana (maj/min)   balance check error   diya ₹      kitaab mein ₹   kitaab se gayab ₹   minus accounts   ₹100 se zyada diya ₹\nCP quorum          1,000 / 0               0 / 1,000          768 (min taraf)       56,200      56,200          0                   0                0\nAP + LWW           1,000 / 1,000           0 / 0                0 (min taraf)       1,11,620    55,420          56,200              0                22,840\nAP + ledger        1,000 / 1,000           0 / 0                0 (min taraf)       1,11,620    1,11,620        0                   579              22,840\nAP + offline ₹20   1,000 / 194             0 / 806              0 (min taraf)       59,170      59,170          0                   40               530\n\nCP: 2 nodes wali taraf quorum (3 of 5) nahi bana sakti → har withdrawal aur balance check mana. Paisa kabhi zyada nahi gaya.\nAP + LWW: dono taraf ne apna BALANCE likha; jodne par baad wala balance jeeta → ek withdrawal kitaab se gayab.\nAP + ledger: dono withdrawals kitaab mein (CRDT jaisa); account minus mein dikhta hai, bank wasool kar sakta hai.\nAP + offline ₹20: chhoti taraf sirf ₹20 tak deti hai → nuksaan ki seema tay. Asli ATM networks mein stand-in policy issuer se\nbaat na ho tab withdrawals ki seema tay karti hai."
        }
      ],
      "observe": {
        "q": "ex1 mein CP ne balance checks par bhi error diya (768). Sirf withdrawals kyun nahi?",
        "choices": [
          "Lab ke quorum design mein pakka read bhi majority maangta hai",
          "Balance check bhi ek withdrawal hai, isliye withdrawal ka niyam lagta hai",
          "Chhoti taraf ki copy mit gayi thi, isliye padhne ko kuch tha hi nahi"
        ],
        "answer": 0,
        "hint": "CP ka vaada kya hai: har read sabse naya sach, ya koi bhi copy?",
        "explain": "CP ka C (linearizability) kehta hai: read sabse naya likha hua dikhaye, ya request ruke. Lab ke majority design mein chhoti taraf ko badi taraf ke naye writes pata nahi, toh chhoti taraf pakka read serve nahi karti. (CAP koi ek algorithm nahi bataata; majority lab ka chuna design hai.) Purana balance dikhana AP wala jawab hota.",
        "choiceExplanations": [
          "CP ka C (linearizability) kehta hai: read sabse naya likha hua dikhaye, ya request ruke. Lab ke majority design mein chhoti taraf ko badi taraf ke naye writes pata nahi, toh chhoti taraf pakka read serve nahi karti. (CAP koi ek algorithm nahi bataata; majority lab ka chuna design hai.) Purana balance dikhana AP wala jawab hota.",
          "Balance check sirf padhta hai, paisa nahi deta; mana ki wajah pakka read hai.",
          "Chhoti taraf ki copy maujood thi; dikkat: copy naya sach hai ya nahi, pata nahi."
        ]
      },
      "lesson": "Atka node aur mara node ek jaise dikhte hain. Partition mein CP chhoti taraf ko mana karwata hai; AP dono taraf chalata hai aur jodne ka niyam tay karta hai ki galti chhupegi ya dikhegi."
    }
  ],
  "interview": {
    "title": "Interview Round — CAP",
    "instructions": "Pehle socho: partition mein kaunsa operation mana ho sakta hai, aur kaunsa purane data se chal sakta hai? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "E-commerce: product page, cart aur payment. Do regions ke beech link toota. Niyam: payment debit shared balance se zyada kabhi nahi, same request ka charge dobara nahi; product page purana chal sakta hai. Har feature ke liye kya?",
        "choices": [
          "Catalog purani copy se; debit sirf quorum milne par; cart merge karo",
          "Poori site band karo — ek bhi feature galat dikhe toh brand ka nuksaan hai",
          "Sab AP rakho — partition kuch minute ka hota hai, payment baad mein theek ho jaayega",
          "Sab CP rakho — consistency hamesha zaroori hai, availability ka nuksaan chhota hai"
        ],
        "answer": 0,
        "explain": "CAP ka faisla poore system ka nahi, har operation ka hai (Brewer 2012). Purana product page chalega; payment mein dohra charge nahi chalega; cart mein additions ko entries (CRDT jaisa) ki tarah jodna galti ko dikhne deta hai. Lab ex1: AP + LWW ne ₹56,200 kitaab se gayab kiye.",
        "choiceExplanations": [
          "CAP ka faisla poore system ka nahi, har operation ka hai (Brewer 2012). Purana product page chalega; payment mein dohra charge nahi chalega; cart mein additions ko entries (CRDT jaisa) ki tarah jodna galti ko dikhne deta hai. Lab ex1: AP + LWW ne ₹56,200 kitaab se gayab kiye.",
          "Poori site band karna har feature ke liye CP chunna hai, jab zyadatar features ko zaroorat nahi.",
          "Bina coordination dono regions shared balance kharch karein toh overdraft ka khatra; dohra charge rokne ko request ID chahiye.",
          "Sab CP = product page jaisi cheezein bhi partition mein band."
        ]
      },
      {
        "q": "5 nodes ka Raft cluster, network 3 | 2 mein toota. Kya hoga?",
        "choices": [
          "3 wali taraf naya leader chunke likhti rahegi; 2 wali taraf naye writes commit nahi kar sakti",
          "Poora cluster writes band — 5 mein se 2 nodes alag hain toh koi bhi taraf safe nahi",
          "Dono taraf apna leader chunengi aur likhti rahengi; network judne par Raft merge karega",
          "2 wali taraf likhegi kyunki purana leader 2 wali taraf tha; 3 wali intezaar karegi"
        ],
        "answer": 0,
        "explain": "Raft mein commit ke liye majority (3 of 5). 3 wali taraf majority hai, leader chun sakti hai aur likh sakti hai. 2 wali taraf ka purana leader bhi majority tak nahi pahunchta, toh purane leader ke writes commit nahi hote. Video ka \"3 nodes baat na karein toh sab band\" sirf tab sach jab kisi taraf majority na bache.",
        "choiceExplanations": [
          "Raft mein commit ke liye majority (3 of 5). 3 wali taraf majority hai, leader chun sakti hai aur likh sakti hai. 2 wali taraf ka purana leader bhi majority tak nahi pahunchta, toh purane leader ke writes commit nahi hote. Video ka \"3 nodes baat na karein toh sab band\" sirf tab sach jab kisi taraf majority na bache.",
          "Majority wali taraf chalti hai; poora band tabhi jab koi majority na ho.",
          "Raft ek term mein ek leader chunta hai; alag terms ki histories apne aap merge nahi hoti, aur minority naye writes commit nahi karti.",
          "Purana leader majority ke bina commit nahi kar sakta."
        ]
      }
    ]
  },
  "success": [
    "CP aur AP ko ek operation ke example se samjha sakte ho",
    "AP mein balance vs entries likhne ka farq bata sakte ho",
    "Timeout = shak, saboot nahi — samjha sakte ho"
  ],
  "cards": [
    {
      "front": "Partition mein CP ka matlab?",
      "back": "Successful operations ka linearizable kram bachta hai; prabhavit requests ruk sakti hain. Lab ke majority design mein 2-node taraf writes aur pakke reads mana karti hai. Lab 58 ex1: chhoti taraf ke 1,000 withdrawals + 768 balance checks mana; zyada paisa 0."
    },
    {
      "front": "AP + LWW ka khatra?",
      "back": "Dono taraf ki value mein se ek chupchaap mit'ti hai. Lab 58 ex1: ₹56,200 ke withdrawals kitaab se gayab. Entries (ledger) likho toh galti dikhti hai: 579 accounts minus."
    },
    {
      "front": "Atka vs mara node?",
      "back": "Bahar se ek jaise: jawab band. Lab 58 ex0: 100 ms timeout ne 2 s atke zinda node ko ~583–586 ms par mara kaha; 3 s timeout ne asli crash ~3 s baad pakda."
    }
  ]
}
]);
})();
