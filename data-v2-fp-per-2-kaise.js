/* First Principles — FAANG Senior Engineer.
   Source credit: The Physics of Persistence: B-Trees vs LSM-Trees (RAuIWs3ne9g), numbered video 5/15.
   Evidence: docker-labs/55-persistence/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "app", "icon": "🧾", "label": "order service", "x": 150, "y": 145}, {"id": "wal", "icon": "📒", "label": "wal.log (notepad)", "x": 620, "y": 70}, {"id": "tab", "icon": "📕", "label": "table.snap (register)", "x": 620, "y": 220}];
const EDGES = [{"from": "app", "to": "wal"}, {"from": "wal", "to": "tab"}, {"from": "app", "to": "tab"}];
VISUALS["fp-per-kaise"] = { t: "Pehle notepad mein likho, register baad mein. Crash ke baad register + notepad = sab wapas.", html: SD.viz.svg(HERO, EDGES, { nodes: { app: {tone:'ok',badge:'restart'}, wal: {tone:'acc',badge:'append'}, tab: {tone:'ok',badge:'checkpoint'} } }, {w:890,h:290}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-per-kaise",
  "icon": "💾",
  "group": "💾 Physics of Persistence",
  "title": "Persistence 2 · Kaise — notepad, register aur palta bit",
  "badge": "WAL Wala",
  "objectives": [
    "Write-ahead log aur checkpoint milke crash se kaise bachate hain?",
    "Recovery ka kram kya hai, aur aadha record kyun kaatna?",
    "Checksum kya pakadta hai, aur kya nahi kar sakta?"
  ],
  "lesson": [
    "<h3>📒 Notepad aur register</h3><p>Raseedon ki line lambi hai. Cashier har bill ke baad mota register kholke sahi panna dhoondhe toh line ruk jaaye. Isliye cashier har bill notepad ki agli line mein likhta hai — tez. Dukaan band hone par notepad se register bharta hai, aur notepad ka panna phaad deta hai.</p><p>Lab ka database bhi pehle WAL (notepad) mein likhta hai aur baad mein table (register) checkpoint karta hai. Aaj dekhte hain notepad kab bachata hai, aur register ke panne par chupke se badla hua akshar kaun pakadta hai.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "📒 Notepad pehle, register baad mein",
      "goal": "Lab 55 ka KV store: har order pehle <b>wal.log</b> ke aakhir mein append + fsync, phir \"done\". Kabhi-kabhi poori table <b>table.snap</b> mein utaar ke log khaali (checkpoint). Restart par table + log.",
      "nodes": [
        {
          "id": "app",
          "icon": "🧾",
          "label": "order service",
          "x": 150,
          "y": 145
        },
        {
          "id": "wal",
          "icon": "📒",
          "label": "wal.log (notepad)",
          "x": 620,
          "y": 70
        },
        {
          "id": "tab",
          "icon": "📕",
          "label": "table.snap (register)",
          "x": 620,
          "y": 220
        }
      ],
      "edges": [
        {
          "from": "app",
          "to": "wal"
        },
        {
          "from": "wal",
          "to": "tab"
        },
        {
          "from": "app",
          "to": "tab"
        }
      ],
      "viz": {
        "w": 890,
        "h": 290
      },
      "vars": [
        {
          "id": "wal",
          "label": "wal.log"
        },
        {
          "id": "tab",
          "label": "table.snap"
        },
        {
          "id": "mem",
          "label": "RAM mein table"
        }
      ],
      "steps": [
        {
          "title": "Append",
          "clock": "order-41",
          "say": "Order-41 aaya. Service <b>wal.log ke aakhir mein</b> ek record jodti hai, fsync karti hai, phir \"done\". Table ki file ko haath nahi lagaya.",
          "nodes": {
            "app": {
              "tone": "ok",
              "badge": "done"
            },
            "wal": {
              "tone": "ok",
              "badge": "+41"
            },
            "tab": {
              "tone": "idle",
              "badge": "—"
            }
          },
          "vars": {
            "wal": "41",
            "tab": "—",
            "mem": "41"
          },
          "flows": [
            {
              "from": "app",
              "to": "wal",
              "label": "append + fsync",
              "tone": "ok"
            }
          ],
          "ask": {
            "q": "Table ki file ke beech mein order dhoondh ke badalne ke bajaye log ke aakhir mein jodna kyun?",
            "choices": [
              "Aakhir mein jodna ek seedhi, chhoti write hai; table mein sahi jagah dhoondh ke badalna zyada kaam",
              "Log ke aakhir mein likha data compress ho jaata hai, isliye disk par aadhi jagah leta hai",
              "Table ki file sirf raat ko khulti hai; din mein table ki file ko koi likh hi nahi sakta"
            ],
            "answer": 0,
            "hint": "Cashier ke liye kya tez hai: notepad ki agli line, ya register mein sahi panna dhoondhna?",
            "explain": "Notepad ki agli line: koi dhoondhna nahi, bas aakhir mein jodo. Disk ke liye bhi aakhir mein likhna seedha kaam hai, jabki table mein sahi jagah badalne ke liye padhna, badalna, likhna padta hai. Log mein order pakka ho gaya; table baad mein.",
            "choiceExplanations": [
              "Notepad ki agli line: koi dhoondhna nahi, bas aakhir mein jodo. Disk ke liye bhi aakhir mein likhna seedha kaam hai, jabki table mein sahi jagah badalne ke liye padhna, badalna, likhna padta hai. Log mein order pakka ho gaya; table baad mein.",
              "Lab ka log compress nahi karta; har record mein lambai, header CRC32, data CRC32 aur data hai.",
              "Table kabhi bhi likhi ja sakti hai; log pehle isliye ki log ka append sasta aur seedha hai."
            ]
          }
        },
        {
          "title": "Doosra order",
          "clock": "order-42",
          "say": "Order-42 bhi log mein: append + fsync + \"done\".",
          "nodes": {
            "app": {
              "tone": "ok",
              "badge": "done"
            },
            "wal": {
              "tone": "ok",
              "badge": "+42"
            },
            "tab": {
              "tone": "idle",
              "badge": "—"
            }
          },
          "vars": {
            "wal": "41, 42",
            "tab": "—",
            "mem": "41, 42"
          },
          "flows": [
            {
              "from": "app",
              "to": "wal",
              "label": "append + fsync",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "Checkpoint",
          "clock": "checkpoint",
          "say": "Poori table <b>table.snap.tmp</b> mein likho, fsync, phir rename karke <b>table.snap</b>, folder ka fsync. Ab log khaali.",
          "nodes": {
            "app": {
              "tone": "busy",
              "badge": ""
            },
            "wal": {
              "tone": "idle",
              "badge": "khaali"
            },
            "tab": {
              "tone": "ok",
              "badge": "41, 42"
            }
          },
          "vars": {
            "wal": "—",
            "tab": "41, 42",
            "mem": "41, 42"
          },
          "flows": [
            {
              "from": "wal",
              "to": "tab",
              "label": "",
              "tone": "ok"
            }
          ],
          "ask": {
            "q": "Purani table.snap ke upar seedha likhne ke bajaye temp file aur rename kyun?",
            "choices": [
              "Beech mein bijli gayi toh table aadhi-adhoori; rename poori file ek jhatke mein badalta hai",
              "Rename disk par jagah bachata hai, kyunki naya data purani file ke bytes dobara use karta hai",
              "Seedha likhne par OS table ki file ko lock kar deta hai, aur orders ka log bhi ruk jaata hai"
            ],
            "answer": 0,
            "hint": "Likhte-likhte bijli gayi toh table.snap kaisi dikhegi?",
            "explain": "Seedha likhne mein beech ka crash aadhi likhi table chhodta hai — purani bhi kharab, nayi bhi adhoori. Temp file poori likh ke fsync, phir rename: table.snap ya toh purani, ya poori nayi. Folder ka fsync rename ko pakka karta hai.",
            "choiceExplanations": [
              "Seedha likhne mein beech ka crash aadhi likhi table chhodta hai — purani bhi kharab, nayi bhi adhoori. Temp file poori likh ke fsync, phir rename: table.snap ya toh purani, ya poori nayi. Folder ka fsync rename ko pakka karta hai.",
              "Temp file alag jagah leti hai; rename sirf naam badalta hai, jagah nahi bachata.",
              "Lab ka log alag file hai; table likhte waqt log par koi lock nahi."
            ]
          }
        },
        {
          "title": "Do aur orders",
          "clock": "order-44",
          "say": "Order-43 aur 44 log mein (append + fsync). Table.snap mein abhi sirf 41, 42.",
          "nodes": {
            "app": {
              "tone": "ok",
              "badge": "done"
            },
            "wal": {
              "tone": "ok",
              "badge": "43, 44"
            },
            "tab": {
              "tone": "ok",
              "badge": "41, 42"
            }
          },
          "vars": {
            "wal": "43, 44",
            "tab": "41, 42",
            "mem": "41–44"
          },
          "flows": [
            {
              "from": "app",
              "to": "wal",
              "label": "append + fsync",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "Bijli gayi, restart",
          "clock": "restart",
          "say": "Machine wapas aayi. RAM khaali. Service ko charon orders wapas chahiye.",
          "nodes": {
            "app": {
              "tone": "busy",
              "badge": "restart"
            },
            "wal": {
              "tone": "ok",
              "badge": "43, 44"
            },
            "tab": {
              "tone": "ok",
              "badge": "41, 42"
            }
          },
          "vars": {
            "wal": "43, 44",
            "tab": "41, 42",
            "mem": "?"
          },
          "flows": [
            {
              "from": "tab",
              "to": "app",
              "label": "1. load",
              "tone": "acc"
            },
            {
              "from": "wal",
              "to": "app",
              "label": "2. replay",
              "tone": "acc"
            }
          ],
          "ask": {
            "q": "Recovery kis kram mein chalegi?",
            "choices": [
              "Pehle table.snap (41, 42), phir log replay (43, 44) — log naya hai, upar se lagta hai",
              "Pehle log replay (43, 44), phir table.snap — table purani hai, isliye aakhir mein lagti hai",
              "Sirf log — table.snap ki zaroorat nahi, kyunki log mein har order hamesha rehta hai"
            ],
            "answer": 0,
            "hint": "Kaunsi file naye badlaav rakhti hai?",
            "explain": "Table checkpoint ke pal tak ki tasveer hai; log checkpoint ke baad ke badlaav. Pehle table, phir log upar se: lab ex0 mein \"2 rows from table.snap + 2 replayed from log\" — kuch nahi gaya.",
            "choiceExplanations": [
              "Table checkpoint ke pal tak ki tasveer hai; log checkpoint ke baad ke badlaav. Pehle table, phir log upar se: lab ex0 mein \"2 rows from table.snap + 2 replayed from log\" — kuch nahi gaya.",
              "Is example mein keys alag hain, toh kram se farq nahi dikhta. Par log mein order-41 ka naya maan (300) hota aur table baad mein lagti, toh order-41 phir purana 250 ban jaata.",
              "Checkpoint ne log khaali kiya tha; 41 aur 42 ab sirf table.snap mein hain."
            ]
          }
        },
        {
          "title": "Aadha record",
          "clock": "torn",
          "say": "Ek aur baar: order-45 likhte-likhte bijli gayi. Log ke aakhir mein aadha record bacha. Header poora aur header ka checksum sahi, par data ke bytes kam. Lab maanta hai ki aisa sirf append ke beech crash se hota hai. Lab ex2: reader 3 records par bharosa karke byte 102 par ruk jaata hai — \"torn record\".",
          "nodes": {
            "app": {
              "tone": "busy",
              "badge": "open()"
            },
            "wal": {
              "tone": "bad",
              "badge": "aadha ✗"
            },
            "tab": {
              "tone": "ok",
              "badge": ""
            }
          },
          "vars": {
            "wal": "3 records + aadha",
            "tab": "—",
            "mem": "3 records"
          },
          "ask": {
            "q": "Restart par open() aadhe record ko kaat deta hai, phir naye orders jodta hai. Kaate bina jodte toh?",
            "choices": [
              "Naye orders aadhe record ke peeche chhup jaate — reader aadhe record par rukta, aage kabhi nahi padhta",
              "Kuch nahi hota — reader aadhe record ko chhod ke apne aap agle poore record se padhna shuru karta",
              "Aadha record apne aap poora ho jaata — naya order aadhe record ki khaali jagah bhar deta"
            ],
            "answer": 0,
            "hint": "Reader kahan rukta hai, aur naya record kahan juda?",
            "explain": "Reader pehle adhoore record par rukta hai; adhoore record ke baad ke bytes ka kram pata nahi. Naya record aadhe record ke baad juda toh kabhi padha hi nahi jaayega. Lab ex2: kaate bina order-5 \"invisible\"; kaatne ke baad order-5 = 50.",
            "choiceExplanations": [
              "Reader pehle adhoore record par rukta hai; adhoore record ke baad ke bytes ka kram pata nahi. Naya record aadhe record ke baad juda toh kabhi padha hi nahi jaayega. Lab ex2: kaate bina order-5 \"invisible\"; kaatne ke baad order-5 = 50.",
              "Aadhe record ke baad agla poora record kahan shuru hota hai, reader ke paas is baat ka koi nishaan nahi.",
              "Append hamesha file ke aakhir mein jaata hai; aadhe record ki jagah nahi bharta."
            ]
          }
        }
      ],
      "lesson": "Log mein append + fsync = order pakka. Checkpoint table ko temp + rename se poora likhta hai, phir log khaali. Recovery: table, phir log upar se. Crash ke beech adhoora aakhri record kaato, warna naye records chhup jaate hain. Checksum fail ho toh ruko, log mat chhuo."
    },
    {
      "type": "cards",
      "title": "🔍 Ek bit palta — kaun pakdega?",
      "goal": "Disk par likha hua bhi chupke se badal sakta hai. Lab 55 ex3: asli files, ek bit palta.",
      "lesson": "Checksum chupi kharabi pakadta hai; doosri copy theek karti hai. Akela checksum data wapas nahi la sakta.",
      "steps": [
        {
          "title": "1. Andrew → Andrew?",
          "say": "1,000 naam, do files: plain text, aur har naam ke saath CRC32 (32 bit ka \"saaransh\"). Dono mein naam #500 \"Andrew Fernandes\" ke aakhri akshar ka ek bit palta.",
          "ask": {
            "q": "Plain text wali file padhne par kya hoga?",
            "choices": [
              "Koi error nahi — naam #500 ab \"Andrew Fernander\", aur reader ko pata hi nahi",
              "Reader error dega — file system har galat bit ko padhte waqt khud pakad leta hai",
              "File khulegi hi nahi — ek bit palatne se poori text file ka format toot jaata hai"
            ],
            "answer": 0,
            "hint": "\"s\" aur \"r\" dono valid akshar hain?",
            "explain": "Lab ex3: plain text ne 1,000 naam bina error padhe; naam #500 \"Andrew Fernander\" ban gaya. Valid akshar se valid akshar — kisi ko shak nahi. CRC32 wali file mein slot #500 ka checksum nahi mila: 999 theek, 1 fail.",
            "choiceExplanations": [
              "Lab ex3: plain text ne 1,000 naam bina error padhe; naam #500 \"Andrew Fernander\" ban gaya. Valid akshar se valid akshar — kisi ko shak nahi. CRC32 wali file mein slot #500 ka checksum nahi mila: 999 theek, 1 fail.",
              "Lab ne normal file write se byte badla. Plain text reader ke paas naam ka alag checksum nahi tha, isliye badlaav chupchaap padha gaya.",
              "Text file mein ek akshar badla; baaki file waisi hi khulti hai."
            ]
          }
        },
        {
          "title": "2. Pakadna vs theek karna",
          "say": "CRC32 ne slot #500 pakda. Lab ne doosri copy (replica) se slot #500 utha ke likha: 1,000/1,000 theek.",
          "ask": {
            "q": "Checksum fail hua, par doosri copy nahi hai. Kya kar sakte ho?",
            "choices": [
              "Kharab row ko kharab maano — error ya alert do; asli naam wapas laana mumkin nahi",
              "CRC32 se asli naam wapas bana lo — checksum mein poora naam chhupa hota hai",
              "Row ko waise hi chalne do — ek bit ka farq naam ke liye koi maayne nahi rakhta"
            ],
            "answer": 0,
            "hint": "32 bit mein poora naam samata hai?",
            "explain": "Checksum sirf batata hai ki data badla; asli data nahi rakhta. Doosri copy ho toh theek karo, na ho toh galat data ko sahi maan ke aage mat bhejo. Isliye checksum + replication saath chalte hain.",
            "choiceExplanations": [
              "Checksum sirf batata hai ki data badla; asli data nahi rakhta. Doosri copy ho toh theek karo, na ho toh galat data ko sahi maan ke aage mat bhejo. Isliye checksum + replication saath chalte hain.",
              "32 bit ka saaransh 16 akshar ka naam wapas nahi bana sakta; sirf farq pakadta hai.",
              "Naam, rakam ya account number mein ek bit ka farq galat insaan tak paisa bhej sakta hai."
            ]
          }
        },
        {
          "title": "3. Asli duniya",
          "say": "FAST 2008 ka study: <b>1.53 million</b> disk drives, 41 mahine, <b>4 lakh se zyada</b> checksum mismatches. Wajah sirf cosmic ray nahi — firmware bugs, galat jagah likhe writes, cables, memory bhi. ZFS jaise file systems aur kai databases har page ka checksum rakhte hain."
        },
        {
          "title": "4. Naam",
          "say": "Notepad wala log: <b>write-ahead log (WAL)</b>. Table utaar ke log khaali karna: <b>checkpoint</b>. Restart par log chalana: <b>recovery / replay</b>. Aadha likha record: <b>torn write</b>. Chupke se badla data: <b>bit rot / silent corruption</b>."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 SIGKILL aur ek palta bit",
      "project": "55-persistence",
      "exercise": "ex2-crash",
      "goal": "Asli writer process ko SIGKILL, restart par ginti. Aadha record. Phir asli files mein ek bit palto.",
      "why": "Node 22+ chahiye. ex2 asli processes aur files hai; ack ki ginti har run thodi badlegi. ex3 asli files, har run same.",
      "steps": [
        {
          "text": "Lab folder se: crash.",
          "cmd": "cd docker-labs/55-persistence && npm start -- ex2-crash",
          "expect": "REAL RUN: Node v24.18.0, linux; child process killed with SIGKILL after it reported 5,000 acks\n\nsync     killed by   acked to parent   records in wal.log after restart   acked but missing   log end\nnone     SIGKILL               5,000                              5,000                   0   clean\ncommit   SIGKILL               5,000                              5,000                   0   clean\nkill -9 ends the PROCESS, not the OS: bytes already handed to write() are in the page cache and reach the disk later.\nA power cut also ends the OS — see ex0 (model) for what sync=none loses then.\n\n== torn tail: the last record is cut in half (power failed mid-write) ==\nwal.log: 118 bytes; reader trusts 3 records, stops at byte 102: torn record\nif the torn bytes stay and order-5 is appended after them: reader finds 3 records — order-5 is invisible\nKV.open(): replayed 3, cut the log at byte 102 (torn record)\nafter cutting, order-5 appended, reopened: order-5 = 50, keys = 4"
        },
        {
          "text": "Bit rot.",
          "cmd": "npm start -- ex3-bitrot",
          "expect": "REAL FILES: 1000 names; \"Andrew Fernandes\" is name #500. Flipping bit 0 of the last letter in both files.\nplain text : read 1000 names, no error. Name #500 is now \"Andrew Fernander\". Changed names: 1 — the reader cannot tell.\nchecksummed: 999 slots verify, 1 fails: #500 (\"Andrew Fernander\" does not match its CRC32)\nrepair     : slot #500 copied from the replica → 1000/1000 verify, name #500 = \"Andrew Fernandes\"\nA checksum DETECTS damage; a second copy REPAIRS it. Neither alone does both."
        }
      ],
      "observe": {
        "q": "ex2 mein sync=none (fsync ke bina) bhi SIGKILL par 0 orders gaye. Toh fsync bekaar hai?",
        "choices": [
          "Nahi — kill -9 sirf process maarta hai, OS bytes bacha leta hai; bijli ke liye safal fsync chahiye",
          "Haan — test ne dikha diya ki bina fsync ke bhi har crash mein saare orders bachte hain",
          "Haan — Linux ka page cache bijli jaane par bhi kuch second tak data sambhal ke rakhta hai"
        ],
        "answer": 0,
        "hint": "SIGKILL kisko maarta hai — process ko, ya machine ko?",
        "explain": "SIGKILL ne sirf process maara; OS aur page cache zinda rahe, toh bytes disk tak pahunche. Bijli jaane par page cache ke bytes kho sakte hain — ex0 ke model mein sync=none ke do \"done\" orders gaye. fsync power cut ke liye hai.",
        "choiceExplanations": [
          "SIGKILL ne sirf process maara; OS aur page cache zinda rahe, toh bytes disk tak pahunche. Bijli jaane par page cache ke bytes kho sakte hain — ex0 ke model mein sync=none ke do \"done\" orders gaye. fsync power cut ke liye hai.",
          "Test sirf app crash ka tha; power cut ka asli test process se nahi ho sakta.",
          "Page cache RAM hai; bijli ke saath turant khaali."
        ]
      },
      "lesson": "App crash par OS bytes bacha leta hai; power cut ke baad sirf safal fsync kiye bytes ki guarantee hai. Adhoora aakhri record kaato. Checksum chupi kharabi pakadta hai, replica theek karti hai."
    }
  ],
  "interview": {
    "title": "Interview Round — log, recovery aur corruption",
    "instructions": "Pehle socho: reader kahan rukta hai, kaunsi file naye badlaav rakhti hai, aur checksum ke paas asli data hai ya nahi? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Ek baar bijli jaane ke baad se ajeeb bug: restart ke baad lage naye orders agle restart par gayab ho jaate hain. Purane orders theek. Sabse sambhavit wajah?",
        "choices": [
          "Log ke aakhir mein aadha record bacha tha aur kaata nahi gaya — naye records aadhe record ke peeche chhup gaye",
          "Checkpoint ne table.snap ko purane orders se dobara bhar diya, aur naye orders ke upar purana data likh diya",
          "Bijli ke baad disk ka clock peeche chala gaya, isliye naye orders purane samay ke maan ke hata diye gaye",
          "Naye orders ka fsync tez disk ki wajah se chhoot gaya, isliye naye orders sirf RAM mein bache rahe"
        ],
        "answer": 0,
        "explain": "Recovery pehle adhoore record par rukti hai. Aadha record kaate bina naye records jode gaye toh har restart par reader aadhe record par rukega, naye records kabhi nahi padhega. Ilaaj: open() mein reader ke rukne ki jagah par log kaato (lab ex2).",
        "choiceExplanations": [
          "Recovery pehle adhoore record par rukti hai. Aadha record kaate bina naye records jode gaye toh har restart par reader aadhe record par rukega, naye records kabhi nahi padhega. Ilaaj: open() mein reader ke rukne ki jagah par log kaato (lab ex2).",
          "Checkpoint RAM ki poori table likhta hai, jisme naye orders bhi hain.",
          "Lab ka log samay nahi, kram dekhta hai; ghadi ka recovery se lena-dena nahi.",
          "Tez disk sahi se awaited fsync ko skip nahi karti. Purane orders har restart par theek hain; adhoori framing is repeatable bug ka alag clue hai."
        ]
      },
      {
        "q": "Har page par checksum laga diya. Ek din ek customer ka page checksum mein fail hua. Ek hi machine, koi doosri copy nahi. Kya hoga?",
        "choices": [
          "Kharabi pakdi gayi, par sahi data wapas nahi aa sakta — backup ya replica chahiye thi",
          "Checksum page ko apne aap theek kar dega — CRC32 mein kharab bit ki jagah likhi hoti hai",
          "Database page ko chupchaap chhod ke aage badhega — customer ko koi farq nahi padega",
          "Disk ka ECC page ko pehle hi theek kar chuka hoga — checksum ka fail hona galat alarm hai"
        ],
        "answer": 0,
        "explain": "Checksum pakadta hai, theek nahi karta. Sahi page ke liye doosri copy chahiye: replica, backup ya RAID. Lab ex3 mein replica se slot copy karke 1,000/1,000 theek hua.",
        "choiceExplanations": [
          "Checksum pakadta hai, theek nahi karta. Sahi page ke liye doosri copy chahiye: replica, backup ya RAID. Lab ex3 mein replica se slot copy karke 1,000/1,000 theek hua.",
          "CRC32 kharabi ka pata deta hai, kharab bit ki jagah ya asli bytes nahi.",
          "Customer ka data kharab hai; chupchaap chhodna galat jawab dena hai.",
          "ECC disk ke andar ki kachchi kharabi theek karta hai; checksum fail ka matlab hai kharabi ECC se bach ke aayi."
        ]
      }
    ]
  },
  "success": [
    "WAL, checkpoint aur recovery ka kram samjha sakte ho",
    "Aadha record kaatne ki zaroorat samjha sakte ho",
    "Checksum aur replica ka alag kaam bata sakte ho"
  ],
  "cards": [
    {
      "front": "Write-ahead log?",
      "back": "Har badlaav pehle log ke aakhir mein append + fsync, phir \"done\". Table baad mein (checkpoint). Restart: table load, phir log replay."
    },
    {
      "front": "Checkpoint safe kaise?",
      "back": "Table temp file mein likho, fsync, rename, folder fsync. Phir log khaali. File ya toh purani, ya poori nayi — aadhi kabhi nahi."
    },
    {
      "front": "Checksum vs replica?",
      "back": "Checksum (CRC32) chupi kharabi pakadta hai — lab ex3 mein slot #500. Theek karne ke liye doosri copy chahiye. FAST 2008: 1.53M drives, 41 mahine, 4 lakh+ mismatches."
    }
  ]
}
]);
})();
