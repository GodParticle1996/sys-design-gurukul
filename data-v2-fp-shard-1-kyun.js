/* First Principles — FAANG Senior Engineer.
   Source credit: Sharding (X72epD9Qn3U), numbered video 7/15.
   Evidence: docker-labs/57-sharding/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "router", "icon": "🧭", "label": "Router (app)", "x": 140, "y": 160}, {"id": "jan", "icon": "🗄️", "label": "Shard 0", "x": 450, "y": 70}, {"id": "feb", "icon": "🗄️", "label": "Shard 1", "x": 750, "y": 70}, {"id": "mar", "icon": "🗄️", "label": "Shard 2", "x": 450, "y": 250}, {"id": "apr", "icon": "🔥", "label": "Shard 3", "x": 750, "y": 250}];
const EDGES = [{"from": "router", "to": "jan"}, {"from": "router", "to": "feb"}, {"from": "router", "to": "mar"}, {"from": "router", "to": "apr"}];
VISUALS["fp-shard-kyun"] = { t: "Shard key = samay. Aaj ke saare writes April shard par; baaki teen khaali.", html: SD.viz.svg(HERO, EDGES, { nodes: { router: {tone:'acc',badge:'ts'}, jan: {tone:'idle',badge:'0%'}, feb: {tone:'idle',badge:'0%'}, mar: {tone:'idle',badge:'0%'}, apr: {tone:'bad',badge:'97%'} } }, {w:900,h:340}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-shard-kyun",
  "icon": "🔪",
  "group": "🔪 Sharding",
  "title": "Sharding 1 · Kyun — ek machine ki deewar, aur shard key",
  "badge": "Shard Key Chunne Wala",
  "objectives": [
    "Bada server kab tak, aur sharding kab?",
    "Range aur hash sharding: kaunsa sawaal kahan sasta?",
    "Samay jaisi badhti key ek shard ko kyun jalaati hai?"
  ],
  "lesson": [
    "<h3>🚉 Station ke ticket counters</h3><p>Ek counter ki line bahut lambi ho gayi. Pehle tez clerk rakha — had tak chala. Phir 4 counters khole aur board lagaya: \"apni yatra ke mahine ke counter par jaao\". Aaj sab log aaj ki yatra ka ticket le rahe hain — toh saari bheed April counter par, baaki teen clerk chai pi rahe hain.</p><p>Database mein bhi counters jaisa hi hota hai. Data kai machines (shards) par baanto toh ek niyam (shard key) tay karta hai ki kaun kahan jaaye. Galat niyam = ek shard jalta hai. Aaj naapte hain: kaunsi key kaunsa sawaal sasta karti hai.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "📅 Mahine se shard kiya — April wala shard jal raha hai",
      "goal": "Lab 57 ex1. KhanaKart ke log events 4 shards par: Jan, Feb, Mar, Apr (shard key = event ka samay). 1 Jan – 31 Mar ke 3 lakh events pehle se rakhe hain. Aaj 12 April hai. Har shard ek worker thread hai, apni SQLite file ke saath; router app ke andar hai.",
      "nodes": [
        {
          "id": "router",
          "icon": "🧭",
          "label": "Router (app)",
          "x": 140,
          "y": 160
        },
        {
          "id": "jan",
          "icon": "🗄️",
          "label": "Shard 0",
          "x": 450,
          "y": 70
        },
        {
          "id": "feb",
          "icon": "🗄️",
          "label": "Shard 1",
          "x": 750,
          "y": 70
        },
        {
          "id": "mar",
          "icon": "🗄️",
          "label": "Shard 2",
          "x": 450,
          "y": 250
        },
        {
          "id": "apr",
          "icon": "🔥",
          "label": "Shard 3",
          "x": 750,
          "y": 250
        }
      ],
      "edges": [
        {
          "from": "router",
          "to": "jan"
        },
        {
          "from": "router",
          "to": "feb"
        },
        {
          "from": "router",
          "to": "mar"
        },
        {
          "from": "router",
          "to": "apr"
        }
      ],
      "viz": {
        "w": 900,
        "h": 340
      },
      "vars": [
        {
          "id": "rows",
          "label": "Aaj ke writes kahan"
        },
        {
          "id": "busy",
          "label": "Shards busy"
        },
        {
          "id": "speed",
          "label": "Writes/sec"
        }
      ],
      "steps": [
        {
          "title": "Pehle bada server",
          "clock": "shuru",
          "say": "Ek database server thak gaya toh pehla kadam: bada server (vertical scaling). Code mein ek line nahi badalti. Par ek machine ki had hai: AWS ki sabse badi machines mein bhi 32 TiB RAM hai. Aur ek machine gayi toh sab gaya.",
          "nodes": {
            "router": {
              "tone": "busy",
              "badge": "1 server"
            },
            "jan": {
              "tone": "idle",
              "badge": ""
            },
            "feb": {
              "tone": "idle",
              "badge": ""
            },
            "mar": {
              "tone": "idle",
              "badge": ""
            },
            "apr": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "rows": "1 machine",
            "busy": "1 machine",
            "speed": "ek machine ki had"
          }
        },
        {
          "title": "4 shards, mahine se",
          "clock": "itihaas",
          "say": "Data 4 machines (shards) par baanta. Router ka niyam: event ka mahina = shard. Itihaas barabar baanta: Jan 103,334 · Feb 93,333 · Mar 103,333 · Apr 0 (abhi khaali).",
          "nodes": {
            "router": {
              "tone": "acc",
              "badge": "ts → mahina"
            },
            "jan": {
              "tone": "ok",
              "badge": "Jan · 103,334"
            },
            "feb": {
              "tone": "ok",
              "badge": "Feb · 93,333"
            },
            "mar": {
              "tone": "ok",
              "badge": "Mar · 103,333"
            },
            "apr": {
              "tone": "idle",
              "badge": "Apr · 0"
            }
          },
          "vars": {
            "rows": "—",
            "busy": "—",
            "speed": "—"
          },
          "flows": [
            {
              "from": "router",
              "to": "jan",
              "label": "Jan",
              "tone": "ok"
            },
            {
              "from": "router",
              "to": "feb",
              "label": "",
              "tone": "ok"
            },
            {
              "from": "router",
              "to": "mar",
              "label": "Mar",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "Aaj ke writes",
          "clock": "live",
          "say": "12 April ko 2 lakh naye events aate hain. Har event ka samay = aaj.",
          "nodes": {
            "router": {
              "tone": "acc",
              "badge": "sab → Apr"
            },
            "jan": {
              "tone": "idle",
              "badge": "Jan · 0"
            },
            "feb": {
              "tone": "idle",
              "badge": "Feb · 0"
            },
            "mar": {
              "tone": "idle",
              "badge": "Mar · 0"
            },
            "apr": {
              "tone": "bad",
              "badge": "Apr · 200,000"
            }
          },
          "vars": {
            "rows": "Apr: 200,000 / 200,000",
            "busy": "Apr 97%, baaki 0%",
            "speed": "1.35–3.05 lakh"
          },
          "flows": [
            {
              "from": "router",
              "to": "apr",
              "label": "200,000",
              "tone": "bad"
            }
          ],
          "ask": {
            "q": "4 shards hain. Aaj likhne ki taakat kitni machines ki hai?",
            "choices": [
              "Ek ki — har naya event April mein jaata hai; baaki teen shard sirf purana data rakhte hain",
              "Chaar ki — router events ko chaaron shards par barabar baant deta hai, mahina koi bhi ho",
              "Teen ki — April ka shard naya hai, isliye router April shard ko dheere-dheere load deta hai"
            ],
            "answer": 0,
            "hint": "Aaj ke event ka shard kaun tay karta hai?",
            "explain": "Shard key samay hai, aur aaj ka har event April ka hai. Lab mein April shard 97% busy, baaki teen 0%. Cluster 4 machines ka, likhne ki taakat 1 machine ki. Badhti hui key (samay, auto-increment id) par range sharding hamesha aakhri shard ko garam karti hai: hot tail.",
            "choiceExplanations": [
              "Shard key samay hai, aur aaj ka har event April ka hai. Lab mein April shard 97% busy, baaki teen 0%. Cluster 4 machines ka, likhne ki taakat 1 machine ki. Badhti hui key (samay, auto-increment id) par range sharding hamesha aakhri shard ko garam karti hai: hot tail.",
              "Range sharding mein router mahina dekhta hai, barabar baantna nahi.",
              "Router koi dheere-dheere load nahi deta; niyam sirf mahina dekhta hai."
            ]
          }
        },
        {
          "title": "Shard key badli: id ka hash",
          "clock": "hash",
          "say": "Ab shard = <code>mix32(id) % 4</code>. Hash ek dealer jaisa: lagaataar ids ko alag shards par phenkta hai.",
          "nodes": {
            "router": {
              "tone": "acc",
              "badge": "hash(id) % 4"
            },
            "jan": {
              "tone": "ok",
              "badge": "~50,000"
            },
            "feb": {
              "tone": "ok",
              "badge": "~50,000"
            },
            "mar": {
              "tone": "ok",
              "badge": "~50,000"
            },
            "apr": {
              "tone": "ok",
              "badge": "~50,000"
            }
          },
          "vars": {
            "rows": "har shard ~50,000",
            "busy": "har shard ~91–96%",
            "speed": "4.2–6.7 lakh"
          },
          "flows": [
            {
              "from": "router",
              "to": "jan",
              "label": "¼",
              "tone": "ok"
            },
            {
              "from": "router",
              "to": "feb",
              "label": "",
              "tone": "ok"
            },
            {
              "from": "router",
              "to": "mar",
              "label": "¼",
              "tone": "ok"
            },
            {
              "from": "router",
              "to": "apr",
              "label": "",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "Ek ghante ki report",
          "clock": "range query",
          "say": "Boss: \"10 Feb, 10 se 11 baje ke saare events.\" (139 events.)",
          "nodes": {
            "router": {
              "tone": "acc",
              "badge": "?"
            },
            "jan": {
              "tone": "busy",
              "badge": "poocho"
            },
            "feb": {
              "tone": "busy",
              "badge": "poocho"
            },
            "mar": {
              "tone": "busy",
              "badge": "poocho"
            },
            "apr": {
              "tone": "busy",
              "badge": "poocho"
            }
          },
          "vars": {
            "rows": "139",
            "busy": "hash: 4 shards",
            "speed": "kaam 159–177 µs vs 54–60"
          },
          "ask": {
            "q": "Hash layout mein ek ghante ki report kitne shards se poochni padegi, aur kyun?",
            "choices": [
              "Chaaron se — hash ne ek ghante ke events ko chaaron shards par bikher diya",
              "Sirf Feb wale se — hash ke baad bhi router ko pata hai ki Feb kaunsa shard hai",
              "Kisi se nahi — router ke paas har ghante ki ginti pehle se cache mein rakhi hai"
            ],
            "answer": 0,
            "hint": "Hash layout mein router event ka shard kis cheez se nikaalta hai?",
            "explain": "Hash layout mein shard sirf id se tay hota hai; samay se shard pata nahi chalta. Isliye router chaaron se poochta hai (scatter-gather). Latency lagbhag barabar rahi (calls parallel), par shards ka op-samay (SQL ka kaam) 159–177 µs vs range layout ke 54–60 µs — ~3×. Bhari traffic mein shards ka kul kaam hi capacity khaata hai.",
            "choiceExplanations": [
              "Hash layout mein shard sirf id se tay hota hai; samay se shard pata nahi chalta. Isliye router chaaron se poochta hai (scatter-gather). Latency lagbhag barabar rahi (calls parallel), par shards ka op-samay (SQL ka kaam) 159–177 µs vs range layout ke 54–60 µs — ~3×. Bhari traffic mein shards ka kul kaam hi capacity khaata hai.",
              "Hash layout mein mahina kisi shard ka naam nahi; Feb ke events chaaron par hain.",
              "Lab mein koi cache nahi; har report shards se aati hai."
            ]
          }
        },
        {
          "title": "Ulta sawaal: id se",
          "clock": "id lookup",
          "say": "Support: \"event 123456 dikhao.\" Range layout ko id se mahina pata nahi, isliye chaaron se poochta hai (kaam 38–50 µs). Hash layout: ek shard (kaam 8–10 µs).",
          "nodes": {
            "router": {
              "tone": "acc",
              "badge": "id"
            },
            "jan": {
              "tone": "idle",
              "badge": ""
            },
            "feb": {
              "tone": "idle",
              "badge": ""
            },
            "mar": {
              "tone": "ok",
              "badge": "mila"
            },
            "apr": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "rows": "1",
            "busy": "hash: 1 shard",
            "speed": "kaam ~4–5×"
          }
        }
      ],
      "lesson": "Shard key tay karti hai kaunsa sawaal sasta hai. Samay jaisi badhti key par range sharding: aaj ke saare writes ek shard par. Hash writes baant'ta hai, par range sawaal har shard par jaata hai. Sabse zyada aane wale sawaal se key chuno."
    },
    {
      "type": "cards",
      "title": "🧭 Router, shard key, aur ek disk ka sach",
      "goal": "Lab 57 ex1 ke chaar hisse. Asli SQLite, 4 worker threads; samay machine ke saath badlega.",
      "lesson": "Router ek kaam karta hai: key se shard. Achhi shard key har request mein hoti hai aur traffic baant'ti hai. Aur shards ki alag disks honi chahiye — ek disk par 4 shards se durable writes 4× nahi hote.",
      "steps": [
        {
          "title": "1. Router aur shard key",
          "say": "Router ek library ho sakta hai (app ke andar) ya alag proxy. Kaam: request ki shard key dekho, shard chuno. Key ke aam vikalp: <b>user id</b>, <b>tenant id</b> (company), <b>jagah</b> (Europe ke users), <b>samay</b>. Galat key ki keemat: ek shard jalta hai ya har sawaal sab shards par jaata hai.",
          "ask": {
            "q": "Multi-tenant SaaS (har company ka data alag). Zyadatar requests ek hi company ke andar. Shard key?",
            "choices": [
              "Tenant id — ek company ki saari requests ek shard par, joins shard ke andar",
              "Event ka samay — naya data hamesha ek shard par, purana data alag shards par",
              "Random number — har row alag shard par, toh load hamesha barabar rahega"
            ],
            "answer": 0,
            "hint": "Zyadatar sawaal kis cheez ke andar rehte hain?",
            "explain": "Requests ek company ke andar rehti hain, toh tenant id rakho: ek company ka data ek shard par, query ek shard tak. Dhyaan: ek bahut badi company khud hot shard ban sakti hai; tab us company ko alag shard ya company ke andar doosri key chahiye.",
            "choiceExplanations": [
              "Requests ek company ke andar rehti hain, toh tenant id rakho: ek company ka data ek shard par, query ek shard tak. Dhyaan: ek bahut badi company khud hot shard ban sakti hai; tab us company ko alag shard ya company ke andar doosri key chahiye.",
              "Samay key par aaj ke saare writes ek shard par (ex1: April 97%, baaki 0%).",
              "Random key par har company ka sawaal sab shards par jaayega."
            ]
          }
        },
        {
          "title": "2. Range vs hash, lab ke numbers",
          "say": "<b>Range (mahina):</b> aaj ke writes 200,000 / 200,000 ek shard par; 1.35–3.05 lakh writes/sec. Ek ghante ki report 1 shard. <b>Hash (id):</b> writes chaaron par; 4.2–6.7 lakh/sec (har run mein ~2–3×). Report 4 shards, kaam ~3×."
        },
        {
          "title": "3. Ek disk, chaar shards",
          "say": "Hissa D: har event ka alag commit + fsync (durable). 1 shard: 266–1,619 commits/sec. 4 shards: 634–2,653. Ek run mein ~1.5–1.7× badha, baaki runs bahut hile; 4 shards se 4× ka vaada nahi.",
          "ask": {
            "q": "Chaar shards ne durable commits 4× kyun nahi kiye?",
            "choices": [
              "Chaaron shards ek hi laptop disk par fsync karte hain; disk ki seema ek hi hai",
              "SQLite ek waqt mein sirf ek file kholta hai, isliye baaki teen shard rukte hain",
              "Worker threads ek hi CPU core par chalte hain, isliye chaaron baari baari chalte hain"
            ],
            "answer": 0,
            "hint": "Hisse A mein (bina fsync) shards ne parallel kaam kiya tha. D mein kya share ho raha hai?",
            "explain": "Hisse A mein commit fsync ka intezaar nahi karta tha (synchronous = OFF), aur har shard apne thread par chala. Hisse D mein har commit disk ka fsync maangta hai, aur chaaron shards ek hi disk par hain. Chaaron ek disk ki capacity share karte hain, isliye 4 shards se 4× ka vaada nahi. Asli shards alag machines par alag disks ke saath hote hain, toh har shard ki apni disk capacity hoti hai. Paired naap ke bina exact speedup mat maano.",
            "choiceExplanations": [
              "Hisse A mein commit fsync ka intezaar nahi karta tha (synchronous = OFF), aur har shard apne thread par chala. Hisse D mein har commit disk ka fsync maangta hai, aur chaaron shards ek hi disk par hain. Chaaron ek disk ki capacity share karte hain, isliye 4 shards se 4× ka vaada nahi. Asli shards alag machines par alag disks ke saath hote hain, toh har shard ki apni disk capacity hoti hai. Paired naap ke bina exact speedup mat maano.",
              "Har shard ki apni SQLite file aur apna connection hai; files ek saath khulti hain.",
              "Har shard alag worker thread par hai aur threads parallel chal sakte hain (hisse A mein op-samay 91–96%)."
            ]
          }
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 4 shards: mahine se vs id ke hash se",
      "project": "57-sharding",
      "exercise": "ex1-shard-key",
      "goal": "Asli SQLite, 4 worker threads (har ek ki apni file). Same events do layouts mein: live writes, range query, id lookup, aur ek disk par fsync.",
      "why": "Node 24+ chahiye (SQLite Node ke andar hai). Samay machine ke saath badlega; rows ki ginti same rahegi.",
      "steps": [
        {
          "text": "Lab folder se chalao.",
          "cmd": "cd docker-labs/57-sharding && npm start -- ex1-shard-key",
          "expect": "Itihaas: 3,00,000 events, 1 Jan – 31 Mar 2026 (dono layouts mein same rows)\n  range: rows per shard [103334, 93333, 103333, 0]   (shard 3 = April, abhi khaali)\n  hash:  rows per shard [74967, 74972, 74857, 75204]\n\nA. Live writes — 12 April, 2,00,000 events per round, 3 round, router 2000 ke batch bhejta hai, 8 batch tak ek saath hawa mein\n   router CPU = main thread ka CPU / samay (~100% = rukawat router). shard op-samay = worker ke andar SQL + loop ka samay.\n  range  1,52,288–3,05,005 writes/sec   router CPU 8–14%   aakhri round: rows per shard [0, 0, 0, 200000]   shard op-samay % [0, 0, 0, 97]\n  hash   4,64,336–6,72,629 writes/sec   router CPU 29–44%   aakhri round: rows per shard [49875, 50145, 49947, 50033]   shard op-samay % [92, 93, 93, 96]\n\nB. Range query — \"Feb ke ek ghante ke saare events\", 300 alag ghante\n  range  shards poochhe 1   rows 139 per query   shards ka op-samay  54 µs   median 159 µs   p99 347 µs\n  hash   shards poochhe 4   rows 139 per query   shards ka op-samay 159 µs   median 185 µs   p99 381 µs\n\nC. Ek event, event ke id se — 300 ids\n  range  shards poochhe 4   shards ka op-samay  38 µs   median 110 µs   p99 343 µs\n  hash   shards poochhe 1   shards ka op-samay   8 µs   median 52 µs   p99 115 µs\n\nrange layout ko id se mahina pata nahi, isliye chaaron shards se poochta hai. hash layout ko ghante se shard pata nahi.\n\nD. Durable commits (har event ka alag commit + fsync), 1000 per shard, 3 round, saare shards is laptop ki EK disk par\n  1 shard   1,496–1,565 commits/sec kul\n  4 shards  2,390–2,525 commits/sec kul"
        },
        {
          "text": "Lab ke 9 tests: mod N ka formula, ring, Snowflake (41-bit khidki, restart), UUID bits, backfill, sample check aur chance, rollback, split counter, page fill.",
          "cmd": "npm test",
          "expect": "✔ hash % N: over one full period of N(N+1) hash values, adding a shard moves exactly N/(N+1), removing one moves (N-1)/N (0.569825ms)\n✔ ring: adding a shard moves keys only TO the new shard; removing one moves only that shard's keys (83.06977ms)\n✔ snowflake: layout, increasing IDs, clock guard, sequence overflow, machine id range (2.295887ms)\n✔ UUIDv7 starts with the 48-bit ms timestamp; v4 and v7 carry their version and variant bits (3.974493ms)\n✔ backfill race: overwrite brings back old versions and deleted rows; version + tombstone does not; repair + sweep fix the rest (1294.826826ms)\n✔ sample check: finds every draw when all rows are wrong, none when all are right, and is blind to rows only in new (0.761081ms)\n✔ cluster: one shard runs several statements in one transaction; an error rolls all of them back (44.783434ms)\n✔ split counter: the sub-key counts add up to every vote (48.208704ms)\n✔ B-tree pages (SQLite): increasing integer keys fill leaf pages ~full; UUID keys in a WITHOUT ROWID table do not, increasing or random (88.853554ms)\nℹ tests 9\nℹ suites 0\nℹ pass 9\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0\nℹ duration_ms 1622.830109"
        }
      ],
      "observe": {
        "q": "Hisse A ke hash layout mein router CPU 29–46% aur chaaron shards ka op-samay 91–96% hai. Bhara hua hissa kaunsa?",
        "choices": [
          "Shards ka raasta — router ke paas CPU bacha, shards lagbhag poore time busy",
          "Router — router ek hi thread hai, toh router hamesha sabse dheema hissa hota hai",
          "Disk — har write disk par fsync ka intezaar karta hai, isliye sab ruke hue hain"
        ],
        "answer": 0,
        "hint": "Kis hisse ka % 100 ke paas hai? Hisse A mein synchronous kya tha?",
        "explain": "~100% bhara hissa hi rukawat hota hai. Router CPU 29–46% (kaam bacha hai), shards ka op-samay 91–96% (lagbhag bhara): shard wala raasta seema hai. Op-samay CPU % nahi — SQL, JS loop aur beech ka koi wait, sab shaamil. Hisse A mein <code>synchronous = OFF</code> tha, toh commit fsync ka intezaar nahi karta. Pehle ke run mein router har batch ke baad rukta tha aur shards sirf ~65% busy the; 8 batch hawa mein rakhne se shards bhare.",
        "choiceExplanations": [
          "~100% bhara hissa hi rukawat hota hai. Router CPU 29–46% (kaam bacha hai), shards ka op-samay 91–96% (lagbhag bhara): shard wala raasta seema hai. Op-samay CPU % nahi — SQL, JS loop aur beech ka koi wait, sab shaamil. Hisse A mein <code>synchronous = OFF</code> tha, toh commit fsync ka intezaar nahi karta. Pehle ke run mein router har batch ke baad rukta tha aur shards sirf ~65% busy the; 8 batch hawa mein rakhne se shards bhare.",
          "Ek thread bhi rukawat tabhi jab poora busy ho; lab mein router CPU 29–46% hai.",
          "Hisse A mein synchronous = OFF; fsync ka intezaar sirf hisse D mein hai."
        ]
      },
      "lesson": "Range layout: aaj ke writes ek shard par. Hash layout: writes baante, par range report sab shards par. Ek disk par shards ki capacity share hoti hai: durable writes badh sakte hain, par 4× ka vaada nahi."
    }
  ],
  "interview": {
    "title": "Interview Round — shard key",
    "instructions": "Pehle socho: sabse zyada aane wala sawaal kaunsa hai, aur naye writes kis key par aate hain? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Logs table, roz 50 GB naya data. Team ne shard key <code>created_at</code> (din) rakhi. Writes ek hi node par jaate hain. Kya karoge?",
        "choices": [
          "Key mein hash jodo (jaise hash(device_id) + din) — writes baante, din ka filter phir bhi kaam aaye",
          "Har din naya bada node lagao — aaj ka shard hamesha sabse taaqatwar machine par ho",
          "Logs ko ek hi bade server par wapas le aao — sharding logs ke liye kabhi kaam nahi karti",
          "Har write ke baad sab shards ko copy bhejo — aise sab shards barabar busy rahenge"
        ],
        "answer": 0,
        "explain": "Samay jaisi badhti key par range sharding ka matlab: aaj ka saara data ek shard par (ex1: April 97%, baaki 0%). Hash ka hissa writes ko baant'ta hai. Din ko query filter ya key ke doosre hisse mein rakhne se din wali reports ka kaam kam rehta hai.",
        "choiceExplanations": [
          "Samay jaisi badhti key par range sharding ka matlab: aaj ka saara data ek shard par (ex1: April 97%, baaki 0%). Hash ka hissa writes ko baant'ta hai. Din ko query filter ya key ke doosre hisse mein rakhne se din wali reports ka kaam kam rehta hai.",
          "Aaj ka shard phir bhi ek hi machine; bada node sirf deewar ko aage khiskaata hai.",
          "Logs bhi shard hote hain; samasya key ki hai, sharding ki nahi.",
          "Har shard par copy = har write N baar; kaam badhega, baantega nahi."
        ]
      },
      {
        "q": "Hash sharding (user_id) ke baad ek naya feature: \"pichhle 1 ghante ke saare orders\". Kya expect karoge?",
        "choices": [
          "Query har shard par jaayegi — shards ka kaam badhega, latency sabse dheeme shard jitni",
          "Query sirf ek shard par — hash sab orders ko samay ke kram mein ek jagah rakhta hai",
          "Query fail hogi — hash sharding mein samay par filter karna sambhav hi nahi hai",
          "Koi farq nahi — router har shard ka ek ghante ka data pehle se jodkar rakhta hai"
        ],
        "answer": 0,
        "explain": "Hash ne ek ghante ke orders sab shards par bikher diye. Har shard se poochna padta hai (scatter-gather). Lab ex1: shards ka kaam ~3× (159–177 µs vs 54–60 µs), latency lagbhag barabar kyunki calls parallel. Bahut zyada aane wala sawaal ho toh alag time-index table ya stream socho.",
        "choiceExplanations": [
          "Hash ne ek ghante ke orders sab shards par bikher diye. Har shard se poochna padta hai (scatter-gather). Lab ex1: shards ka kaam ~3× (159–177 µs vs 54–60 µs), latency lagbhag barabar kyunki calls parallel. Bahut zyada aane wala sawaal ho toh alag time-index table ya stream socho.",
          "Hash samay ka kram nahi rakhta; lagaataar ids alag shards par jaati hain.",
          "Har shard apni rows par WHERE chala sakta hai; query chalti hai, bas sab par.",
          "Lab ka router koi jod nahi rakhta; har baar shards se poochta hai."
        ]
      }
    ]
  },
  "success": [
    "Vertical scaling ki had aur sharding ki keemat bata sakte ho",
    "Range vs hash: kaunsa sawaal kahan sasta, numbers se",
    "Hot tail (badhti key) pehchaan sakte ho"
  ],
  "cards": [
    {
      "front": "Range sharding + samay jaisi badhti key?",
      "back": "Aaj ke saare writes aakhri shard par (hot tail). Lab 57 ex1: April shard 97% busy, baaki 0%; 200,000 / 200,000 writes ek shard par."
    },
    {
      "front": "Hash sharding ki keemat?",
      "back": "Range sawaal har shard par (scatter-gather). Lab 57 ex1: ek ghante ki report 4 shards, shards ka kaam ~3× (159–177 µs vs 54–60 µs)."
    },
    {
      "front": "Ek disk par 4 shards?",
      "back": "Durable commits 4× nahi (kuch runs mein ~1.5–1.7×, kuch mein bahut hila): lab 57 ex1 D mein 1 shard 266–1,619/sec, 4 shards 634–2,653/sec. Shards ki alag disks chahiye."
    }
  ]
}
]);
})();
