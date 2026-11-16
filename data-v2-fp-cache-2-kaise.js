/* First Principles — FAANG Senior Engineer.
   Source credit: Caching (t9jtxlu7k4k), numbered video 10/15.
   Evidence: docker-labs/60-caching/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "app", "icon": "📱", "label": "App", "x": 110, "y": 200}, {"id": "cache", "icon": "⚡", "label": "Cache (RAM)", "x": 440, "y": 60}, {"id": "db", "icon": "🗄️", "label": "Database", "x": 620, "y": 200}, {"id": "disk", "icon": "💾", "label": "Disk (fsync)", "x": 760, "y": 350}];
const EDGES = [{"from": "app", "to": "cache"}, {"from": "app", "to": "db"}, {"from": "cache", "to": "db"}, {"from": "db", "to": "disk"}];
VISUALS["fp-cache-kaise"] = { t: "\"Ho gaya\" kab bola, aur us waqt data kahan tha — dono milkar pakkapan tay karte hain.", html: SD.viz.svg(HERO, EDGES, { nodes: { app: {tone:'acc',badge:'save'}, cache: {tone:'busy',badge:'memory'}, db: {tone:'ok',badge:'commit'}, disk: {tone:'ok',badge:'fsync'} } }, {w:900,h:430}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-cache-kaise",
  "icon": "✍️",
  "group": "⚡ Caching",
  "title": "Caching 2 · Kaise — padhna, likhna, aur \"ho gaya\" ka sach",
  "badge": "Bahi-Khata Rakhwala",
  "objectives": [
    "Cache-aside read, write-through aur write-back",
    "Crash mein kaunsi \"ho gaya\" writes jaati hain (asli SIGKILL)",
    "Process crash vs power loss; group commit"
  ],
  "lesson": [
    "<h3>🧾 Dhabe ka order</h3><p>Dhabe par waiter order leta hai. Ek waiter har order turant rasoi ki register mein likhwata hai, phir bolta hai \"ho gaya\" — pakka, par dheema. Doosra waiter order sirf yaad rakhta hai, \"ho gaya\" bol deta hai, aur har ghante register mein likhta hai — tez, par waiter behosh hua toh ghante bhar ke order gaye.</p><p>Cache ke saath likhna bilkul aisa hai. Aaj asli process maar kar ginenge ki kaunsa waiter kitne order bhoolta hai.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "✍️ Likha gaya — par kahan tak pahuncha?",
      "goal": "Teen tareeke, ek hi sawaal: app ko \"ho gaya\" (ack) kab milta hai, aur us waqt data kahan hai? Lab 60 ex2 asli child process ko SIGKILL karke ginta hai ki kitni acked writes file mein bachi.",
      "nodes": [
        {
          "id": "app",
          "icon": "📱",
          "label": "App",
          "x": 110,
          "y": 200
        },
        {
          "id": "cache",
          "icon": "⚡",
          "label": "Cache (RAM)",
          "x": 440,
          "y": 60
        },
        {
          "id": "db",
          "icon": "🗄️",
          "label": "Database",
          "x": 620,
          "y": 200
        },
        {
          "id": "disk",
          "icon": "💾",
          "label": "Disk (fsync)",
          "x": 760,
          "y": 350
        }
      ],
      "edges": [
        {
          "from": "app",
          "to": "cache"
        },
        {
          "from": "app",
          "to": "db"
        },
        {
          "from": "cache",
          "to": "db"
        },
        {
          "from": "db",
          "to": "disk"
        }
      ],
      "viz": {
        "w": 900,
        "h": 430
      },
      "vars": [
        {
          "id": "way",
          "label": "Tareeka"
        },
        {
          "id": "ack",
          "label": "Ack kab"
        },
        {
          "id": "risk",
          "label": "Crash par"
        }
      ],
      "steps": [
        {
          "title": "Cache-aside read",
          "clock": "read",
          "say": "Padhna: app pehle cache se poochta hai. Miss → app DB se padhta hai → cache mein rakhta hai (TTL ke saath). Agli baar hit. Sabse aam tareeka.",
          "nodes": {
            "app": {
              "tone": "acc",
              "badge": "get user:123"
            },
            "cache": {
              "tone": "busy",
              "badge": "miss"
            },
            "db": {
              "tone": "ok",
              "badge": "row mili"
            },
            "disk": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "way": "cache-aside",
            "ack": "—",
            "risk": "cache gaya toh bas miss"
          },
          "flows": [
            {
              "from": "app",
              "to": "cache",
              "label": "miss → set",
              "tone": "acc"
            },
            {
              "from": "app",
              "to": "db",
              "label": "read",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "Write-through",
          "clock": "through",
          "say": "Likhna: cache turant DB ko likhta hai, DB ki pushti ka intezaar, phir app ko \"ho gaya\". DB ne fsync kiya toh crash ke baad bhi data pakka. Lab: har write ka apna fsync = ~760–810 writes/sec.",
          "nodes": {
            "app": {
              "tone": "acc",
              "badge": "save"
            },
            "cache": {
              "tone": "busy",
              "badge": "aage bhejo"
            },
            "db": {
              "tone": "ok",
              "badge": "commit"
            },
            "disk": {
              "tone": "ok",
              "badge": "fsync"
            }
          },
          "vars": {
            "way": "write-through",
            "ack": "DB ke baad",
            "risk": "0 khoye (dheema)"
          },
          "flows": [
            {
              "from": "app",
              "to": "cache",
              "label": "write",
              "tone": "acc"
            },
            {
              "from": "cache",
              "to": "db",
              "label": "write",
              "tone": "ok"
            },
            {
              "from": "db",
              "to": "disk",
              "label": "fsync",
              "tone": "ok"
            }
          ]
        },
        {
          "title": "Write-back",
          "clock": "back",
          "say": "Cache memory mein likh kar turant \"ho gaya\". DB ko baad mein, batch mein. Lab: har 1 s flush, phir SIGKILL → ~60 hazaar acked writes gayab.",
          "nodes": {
            "app": {
              "tone": "acc",
              "badge": "ho gaya ✓"
            },
            "cache": {
              "tone": "bad",
              "badge": "SIGKILL"
            },
            "db": {
              "tone": "idle",
              "badge": "kabhi nahi mila"
            },
            "disk": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "way": "write-back",
            "ack": "memory se",
            "risk": "flush se pehle ka sab gaya"
          },
          "flows": [
            {
              "from": "app",
              "to": "cache",
              "label": "write",
              "tone": "acc"
            }
          ],
          "ask": {
            "q": "Flush har 1 s se har 100 ms kiya. Lab mein kya badla?",
            "choices": [
              "Khoye ~60 hazaar se ~1 hazaar; flush ka interval hi loss ki had hai",
              "Kuch nahi; write-back mein crash par sab writes hamesha chali jaati hain",
              "Writes/sec 10 guna gir gaya, kyunki har flush fsync karta hai baar-baar"
            ],
            "answer": 0,
            "hint": "Crash ke waqt memory mein kitne milliseconds ki writes thi?",
            "explain": "Write-back mein khatra = flush se pehle wali writes. 1 s par lagbhag ek second ki writes (~60 hazaar at 1 lakh/sec) memory mein thi; 100 ms par ~1 hazaar. Writes/sec lagbhag same raha (~91–97 hazaar), kyunki 100 ms mein ek fsync bhi sasta hai.",
            "choiceExplanations": [
              "Write-back mein khatra = flush se pehle wali writes. 1 s par lagbhag ek second ki writes (~60 hazaar at 1 lakh/sec) memory mein thi; 100 ms par ~1 hazaar. Writes/sec lagbhag same raha (~91–97 hazaar), kyunki 100 ms mein ek fsync bhi sasta hai.",
              "Flush ho chuki writes file mein bachi; sirf aakhri interval gaya.",
              "Lab mein dono intervals par ~98–99 hazaar writes/sec; 10 guna girawat nahi."
            ]
          }
        },
        {
          "title": "OS page cache",
          "clock": "os",
          "say": "Database ya editor write() karta hai, OS data RAM (page cache) mein rakhta hai aur \"ho gaya\" bolta hai; disk par baad mein. Lab: process ko SIGKILL → 0 khoye, kyunki data kernel ke paas tha.",
          "nodes": {
            "app": {
              "tone": "acc",
              "badge": "saved"
            },
            "cache": {
              "tone": "idle",
              "badge": ""
            },
            "db": {
              "tone": "busy",
              "badge": "process mara"
            },
            "disk": {
              "tone": "busy",
              "badge": "kernel ke paas"
            }
          },
          "vars": {
            "way": "page cache",
            "ack": "write() ke baad",
            "risk": "process crash: 0; bijli: bina fsync ka data ja sakta"
          },
          "ask": {
            "q": "Toh page cache ka \"ho gaya\" kab tak pakka nahi?",
            "choices": [
              "Bijli ya kernel crash tak: bina fsync ka dirty data kabhi bhi ja sakta hai",
              "Kabhi nahi — process mara phir bhi data bacha, toh page cache hamesha pakka hai",
              "Sirf process crash tak; bijli jaane par OS RAM ko battery se bachata hai"
            ],
            "answer": 0,
            "hint": "Lab ne process maara. Kernel ko kisne maara?",
            "explain": "SIGKILL sirf process ko maarta hai; kernel aur kernel ki RAM chalti rehti hai, isliye 0 khoye. Bijli jaaye ya kernel crash ho toh page cache ka bina likha (dirty) data gaya. Linux defaults (dirty_expire_centisecs = 3000, flusher har 5 s) writeback ki settings hain, khone ki pakki had nahi. Pakka chahiye toh fsync.",
            "choiceExplanations": [
              "SIGKILL sirf process ko maarta hai; kernel aur kernel ki RAM chalti rehti hai, isliye 0 khoye. Bijli jaaye ya kernel crash ho toh page cache ka bina likha (dirty) data gaya. Linux defaults (dirty_expire_centisecs = 3000, flusher har 5 s) writeback ki settings hain, khone ki pakki had nahi. Pakka chahiye toh fsync.",
              "Lab ne sirf process maara; bijli ka test nahi hua.",
              "Aam laptop/server RAM bijli ke saath mit jaati hai; RAM ko battery nahi bachati."
            ]
          }
        }
      ],
      "lesson": "\"Ho gaya\" ka matlab tareeke par tika hai. Write-through: disk tak. Write-back: memory tak (flush interval = loss ki had). Page cache: process crash sah leta hai, bijli nahi."
    },
    {
      "type": "cards",
      "title": "⚖️ Teen tareeke, teen keematein",
      "goal": "Lab 60 ex2 (asli, 3 runs) aur ex3 ke race model se. Video ki do baatein sudhaar ke saath.",
      "lesson": "Pakkapan aur raftaar dono chahiye toh group commit. Write-through bhi \"kabhi stale nahi\" nahi hai.",
      "steps": [
        {
          "title": "1. Group commit: dono duniya",
          "say": "256 pending writes, ek fsync, phir sabka \"ho gaya\". Lab: ~1.71–1.86 lakh writes/sec, crash par 0 khoye. Write-through ka pakkapan, write-back ke paas ki raftaar. Keemat: har write ko kam se kam ek fsync (~1 ms) rukna padta hai, batch banne ka intezaar alag. Databases (Postgres WAL, MySQL redo log) bhi group commit karte hain."
        },
        {
          "title": "2. Write-through bhi stale ho sakta hai",
          "say": "Video: \"cache aur DB hamesha sync, koi stale data nahi\". Teen raaste jinse phir bhi stale: (1) cache update hua, DB write fail; (2) do writers ki race — DB mein A ke baad B, cache mein B ke baad A; (3) koi job seedha DB likhta hai, cache ko bypass karke.",
          "ask": {
            "q": "Admin script raat ko seedha SQL se 10,000 prices badalti hai. Write-through cache par kya hoga?",
            "choices": [
              "Cache purane prices dikhata rahega, jab tak TTL ya delete na ho",
              "Write-through cache khud DB ko dekhta hai, isliye turant naye prices",
              "DB cache ko notify karta hai, isliye write-through mein koi farak nahi"
            ],
            "answer": 0,
            "hint": "Write-through ka niyam: writes cache se hoke jaati hain. Script kis raaste gayi?",
            "explain": "Write-through sirf us write ko sync rakhta hai jo cache se hoke guzre. Script ne cache bypass kiya, toh cache ke paas purana price hai. Ilaaj: TTL (galti ki umar baandho), ya DB ke change log se invalidation (CDC, lab 33).",
            "choiceExplanations": [
              "Write-through sirf us write ko sync rakhta hai jo cache se hoke guzre. Script ne cache bypass kiya, toh cache ke paas purana price hai. Ilaaj: TTL (galti ki umar baandho), ya DB ke change log se invalidation (CDC, lab 33).",
              "Cache DB ko poll nahi karta; hit par apni copy deta hai.",
              "Aam DB cache ko khud notify nahi karta; notification ke liye CDC jaisa raasta banana padta hai."
            ]
          }
        },
        {
          "title": "3. Write-back kahan theek",
          "say": "Like counter, view count, analytics: kuch second ka data kho jaaye toh chalega, aur writes bahut zyada. Payment, order, inventory: nahi. Flush interval ko \"kitna data khona chalega\" ki ginti se chuno."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 SIGKILL karo, file gino",
      "project": "60-caching",
      "exercise": "ex2-writes",
      "goal": "Ek chhota store (child process) 1.6 s likhta hai, phir parent SIGKILL karta hai. Jitni writes ko \"ho gaya\" bola, unmein se kitni file mein hain?",
      "why": "Node 24+ chahiye. Asli writes aur asli fsync, temp folder mein. Numbers disk ke saath badlenge (WSL ki virtual disk); pattern same: write-through dheema, group commit tez aur pakka, write-back mein loss.",
      "steps": [
        {
          "text": "Paanch tareeke, har ek 1.6 s.",
          "cmd": "cd docker-labs/60-caching && npm start -- ex2-writes",
          "expect": "Ek chhota store (child process). 1.6 s chalao, phir SIGKILL (jaise process crash). Phir file padho: jin writes\nko \"ho gaya\" bola gaya tha, unmein se kitni sach mein file mein hain? (16-byte records, is machine ki disk)\n\ntareeka                                                       writes/sec   \"ho gaya\" bola   file mein   khoye\nwrite-through: har write ka apna fsync, phir ack                    811            1,300       1,302        0\ngroup commit: 256 pending writes, EK fsync, phir sabka ack     1,76,260         2,82,368    2,83,904        0\nwrite-back: memory se ack, har 1 s flush + fsync                98,504*         1,58,000      98,000   60,000\nwrite-back: memory se ack, har 100 ms flush + fsync             99,127*         1,59,000    1,58,000    1,000\nOS page cache: write() karke ack, fsync kabhi nahi              99,127*         1,59,000    1,60,000        0\n\n* write-back aur page cache ko 1,00,000 writes/sec diye gaye (memory se ack, isliye aur bhi le sakte the).\n→ Write-through sabse dheema (har write = ek fsync). Group commit ek fsync ko sau writes mein baantta hai — har write ko\n  kam se kam ek fsync (~1 ms) rukna padta hai, batch banne ka intezaar alag. Write-back tez, par flush se pehle crash = writes gayi.\n  Ye sirf PROCESS crash ka test hai (SIGKILL). Bijli/kernel crash ka test nahi hua; file aur folder dono fsync kiye gaye.\n→ OS page cache: process mara, par data kernel ke paas tha, isliye 0 khoye. Bijli jaaye ya kernel crash ho toh bina fsync\n  ka data ja sakta hai. Is machine par dirty_expire = 30 s aur flusher har 5 s jaagta hai — ye writeback ki settings hain,\n  khone ki koi pakki had nahi. Process crash aur power loss alag khatre hain; pakka chahiye toh fsync."
        },
        {
          "text": "Lab ke 5 tests.",
          "cmd": "npm test",
          "expect": "npm notice run lab-60-caching@1.0.0 test\nnpm notice run node --test test/*.test.js\n✔ ladder: a big random ring is far slower than an L1-sized one; random order is slower than sequential (1059.860239ms)\n✔ zipf + LRU: uniform gives top 10% = 10%; more skew, more hits; bigger cache, more hits; LRU keeps its size (209.423523ms)\n✔ writes: after SIGKILL, write-back loses acked writes; through, group commit and the OS page cache lose none (4942.867037ms)\n✔ invalidation: the delete race leaves old data forever without TTL, until TTL with it, and never with a lease (426.038582ms)\n✔ LRU recency and the human scale (0.333507ms)\n✔ herd + penetration: a limiter keeps the DB alive; Bloom has no false negatives and blocks unique-id attacks (10142.85791ms)\nℹ tests 6\nℹ suites 0\nℹ pass 6\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0\nℹ duration_ms 16830.705764"
        }
      ],
      "observe": {
        "q": "Group commit mein \"file mein\" wali ginti \"ho gaya\" se thodi zyada kyun hai?",
        "choices": [
          "Ack ki report har 20 ms jaati hai; kuch writes report se pehle likh chuki thi",
          "Group commit har write do baar likhta hai, isliye file mein duplicate rows hain",
          "SIGKILL ke baad OS ne memory se kuch nayi writes khud hi bana di"
        ],
        "answer": 0,
        "hint": "Parent ko \"ho gaya\" ki ginti kab pata chalti hai?",
        "explain": "Child har 20 ms parent ko acked ginti bhejta hai. Kill aakhri report ke baad aaya, toh kuch writes likhi ja chuki thi par report mein nahi thi. Zyada hona theek hai; khatra tab hai jab \"file mein\" < \"ho gaya\" ho (write-back).",
        "choiceExplanations": [
          "Child har 20 ms parent ko acked ginti bhejta hai. Kill aakhri report ke baad aaya, toh kuch writes likhi ja chuki thi par report mein nahi thi. Zyada hona theek hai; khatra tab hai jab \"file mein\" < \"ho gaya\" ho (write-back).",
          "Har record ek baar likha jaata hai; test lagaataar records ginta hai.",
          "OS khud writes nahi banata; file mein sirf process ka likha data hai."
        ]
      },
      "lesson": "Crash test sabse seedha sach batata hai: \"ho gaya\" ginti vs file ki ginti. Write-back ka loss = flush interval."
    }
  ],
  "interview": {
    "title": "Interview Round — likhne ka tareeka",
    "instructions": "Pehle socho: data kho jaaye toh kitna nuksaan, aur writes kitni tez aati hain? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Wallet service: har top-up ka record. 5,000 top-ups/sec. Team write-back cache chahti hai \"kyunki fsync dheema hai\". Tumhari salah?",
        "choices": [
          "Group commit: ek fsync mein kai writes, crash par 0 khoye, raftaar bhi kaafi",
          "Write-back theek hai — har 1 s flush karo, ek second ka data koi nahi ginta",
          "Write-through + har write ka apna fsync, chahe 600 writes/sec par atak jaaye",
          "fsync hata do — OS page cache process crash mein bhi data bacha leta hai"
        ],
        "answer": 0,
        "explain": "Paisa kho nahi sakta, toh ack se pehle disk tak pakka chahiye. Group commit (lab 60 ex2: ~1.7–1.9 lakh/s, 0 khoye) dono deta hai. Write-back mein 1 s flush = ~60 hazaar acked writes gayi lab mein.",
        "choiceExplanations": [
          "Paisa kho nahi sakta, toh ack se pehle disk tak pakka chahiye. Group commit (lab 60 ex2: ~1.7–1.9 lakh/s, 0 khoye) dono deta hai. Write-back mein 1 s flush = ~60 hazaar acked writes gayi lab mein.",
          "Ek second = hazaaron top-ups; \"ho gaya\" bolkar paisa khona galat hai.",
          "Har write ka apna fsync lab mein ~800/s; 5,000/sec nahi chalega.",
          "Page cache bijli ya kernel crash nahi sahta; paise ke liye fsync chahiye."
        ]
      },
      {
        "q": "Video views ka counter: 2 lakh increments/sec. Kuch second ke views kho jaayein toh chalega. Tareeka?",
        "choices": [
          "Write-back: memory mein jodo, har kuch second batch mein DB ko likho",
          "Write-through: har view par DB write aur fsync, taaki ek bhi na khoye",
          "Har view ko alag row mein insert karo aur DB se ginti nikaalo",
          "Cache mat lagao — DB counter ko seedha UPDATE karo har view par"
        ],
        "answer": 0,
        "explain": "Loss chalta hai aur writes bahut, toh write-back sahi. Flush interval = kitne views kho sakte hain. 2 lakh/sec par har-write-fsync ya har-view UPDATE DB ko gira dega.",
        "choiceExplanations": [
          "Loss chalta hai aur writes bahut, toh write-back sahi. Flush interval = kitne views kho sakte hain. 2 lakh/sec par har-write-fsync ya har-view UPDATE DB ko gira dega.",
          "Ek-ek fsync lab mein ~800/s; 2 lakh/sec ke paas bhi nahi.",
          "2 lakh rows/sec insert aur phir ginti, bahut bhaari kaam hai.",
          "Ek hi row par 2 lakh UPDATE/sec = lock par lambi line."
        ]
      }
    ]
  },
  "success": [
    "Cache-aside, write-through, write-back samjha sakte ho",
    "Crash test ke numbers se loss bata sakte ho",
    "Process crash vs power loss ka farq bata sakte ho"
  ],
  "cards": [
    {
      "front": "Write-back ka loss?",
      "back": "Flush se pehle ki saari acked writes. Lab 60 ex2: 1 s flush par ~60 hazaar, 100 ms par ~1 hazaar (1 lakh writes/sec)."
    },
    {
      "front": "Group commit?",
      "back": "Kai pending writes, ek fsync, phir sabka ack. Lab: ~1.7–1.9 lakh/s, process crash par 0 khoye. Har write kam se kam ~1 fsync jitna rukti hai."
    },
    {
      "front": "Page cache ka \"saved\"?",
      "back": "Process crash sah leta hai (data kernel ke paas). Bijli/kernel crash nahi: bina fsync ka data ja sakta hai (30 s / 5 s writeback settings hain, had nahi). Pakka = fsync."
    }
  ]
}
]);
})();
