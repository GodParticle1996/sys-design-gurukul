/* First Principles — FAANG Senior Engineer.
   Source credit: CAP Theorem & PACELC (Ub9yZucpwC0), numbered video 8/15.
   Evidence: docker-labs/58-cap/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "client", "icon": "📱", "label": "Client", "x": 150, "y": 70}, {"id": "primary", "icon": "🗄️", "label": "Primary", "x": 450, "y": 70}, {"id": "near", "icon": "🗄️", "label": "Paas replica (1 ms)", "x": 300, "y": 290}, {"id": "far", "icon": "🌏", "label": "Door replica (30 ms)", "x": 700, "y": 290}];
const EDGES = [{"from": "client", "to": "primary"}, {"from": "primary", "to": "near"}, {"from": "primary", "to": "far"}];
VISUALS["fp-cap-kaise"] = { t: "Sync-all: dono acks ka intezaar = sabse dheema replica (~60 ms). Async: turant, par crash par raaste ke writes gaye.", html: SD.viz.svg(HERO, EDGES, { nodes: { client: {tone:'acc',badge:'write'}, primary: {tone:'ok',badge:'likha'}, near: {tone:'ok',badge:'1 ms'}, far: {tone:'busy',badge:'30 ms'} } }, {w:900,h:370}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-cap-kaise",
  "icon": "⚖️",
  "group": "🔀 CAP & PACELC",
  "title": "CAP 2 · Kaise — normal din: tez ya pakka?",
  "badge": "Latency Ka Hisaabi",
  "objectives": [
    "PACELC ka E: partition ke bina latency vs consistency",
    "Async, sync-any-1, sync-all: latency aur crash par nuksaan, numbers se",
    "Replica reads ki teen galtiyan aur har galti ka ilaaj"
  ],
  "lesson": [
    "<h3>📮 Registered post ya saadi chitthi?</h3><p>Saadi chitthi daalo, turant \"bhej di\". Registered post: daakghar ki rasid aane tak ruko. Doosre shehar ki rasid aane mein din lagte hain. Network theek ho tab bhi har write par daakghar wala sawaal: turant \"ho gaya\" bolo, ya copy pahunchne ki rasid ka intezaar karo?</p><p>Aaj naapte hain: rasid ka intezaar kitna mehnga hai, aur na karne par kya kho sakta hai.</p>"
  ],
  "stages": [
    {
      "type": "dryrun",
      "title": "⚖️ Partition nahi hai — phir bhi tez ya pakka?",
      "goal": "Lab 58 ex2: ek primary, do replicas. Paas wala replica 1 ms one-way, door wala 30 ms one-way (delay model hai, timers asli). PACELC (Abadi): Partition ho toh A ya C; <b>Else</b> (normal din) Latency ya Consistency.",
      "nodes": [
        {
          "id": "client",
          "icon": "📱",
          "label": "Client",
          "x": 150,
          "y": 70
        },
        {
          "id": "primary",
          "icon": "🗄️",
          "label": "Primary",
          "x": 450,
          "y": 70
        },
        {
          "id": "near",
          "icon": "🗄️",
          "label": "Paas replica (1 ms)",
          "x": 300,
          "y": 290
        },
        {
          "id": "far",
          "icon": "🌏",
          "label": "Door replica (30 ms)",
          "x": 700,
          "y": 290
        }
      ],
      "edges": [
        {
          "from": "client",
          "to": "primary"
        },
        {
          "from": "primary",
          "to": "near"
        },
        {
          "from": "primary",
          "to": "far"
        }
      ],
      "viz": {
        "w": 900,
        "h": 370
      },
      "vars": [
        {
          "id": "mode",
          "label": "Tareeka"
        },
        {
          "id": "lat",
          "label": "\"Ho gaya\" kab (median)"
        },
        {
          "id": "lost",
          "label": "Primary mara: kitne gaye"
        }
      ],
      "steps": [
        {
          "title": "Async",
          "clock": "async",
          "say": "Primary apne paas likhta hai aur turant client ko \"ho gaya\". Replicas ko copy peeche se jaati hai.",
          "nodes": {
            "client": {
              "tone": "ok",
              "badge": "ho gaya"
            },
            "primary": {
              "tone": "ok",
              "badge": "likha"
            },
            "near": {
              "tone": "busy",
              "badge": "raaste mein"
            },
            "far": {
              "tone": "busy",
              "badge": "raaste mein"
            }
          },
          "vars": {
            "mode": "async",
            "lat": "0.00 ms",
            "lost": "?"
          },
          "flows": [
            {
              "from": "client",
              "to": "primary",
              "label": "write",
              "tone": "acc"
            },
            {
              "from": "primary",
              "to": "near",
              "label": "copy",
              "tone": "busy"
            },
            {
              "from": "primary",
              "to": "far",
              "label": "copy",
              "tone": "busy"
            }
          ]
        },
        {
          "title": "Primary mara",
          "clock": "crash",
          "say": "300 writes bheje (beech mein 1 ms ka target wait); 300va write bhejte hi primary mara (teen saved runs mein asal mein t = 332–342 ms). Raaste ke packets gaye. Paas wala replica naya primary.",
          "nodes": {
            "client": {
              "tone": "bad",
              "badge": "300 ko ho gaya"
            },
            "primary": {
              "tone": "bad",
              "badge": "mara"
            },
            "near": {
              "tone": "ok",
              "badge": "naya primary"
            },
            "far": {
              "tone": "idle",
              "badge": ""
            }
          },
          "vars": {
            "mode": "async",
            "lat": "0.00 ms",
            "lost": "1 (door bane: 27–28)"
          },
          "ask": {
            "q": "Async mein client ko \"ho gaya\" mila tha. Phir bhi write kaise gaya?",
            "choices": [
              "Ack replica tak copy pahunchne se pehle; packet raaste mein tha",
              "Replica ne write ko galat samjha aur phenk diya, kyunki write purana tha",
              "Client ne write dobara bheja aur doosre write ne pehle ko mita diya"
            ],
            "answer": 0,
            "hint": "Async mein \"ho gaya\" kis cheez ka intezaar karta hai?",
            "explain": "Async ka \"ho gaya\" sirf primary ka hai. Lab mein primary aakhri write ke turant baad mara: paas replica ka 1 ms ka packet bhi nahi pahuncha → 1 write gaya; door replica primary banta toh 27–28 (30 ms ke packets). Lab mein disk nahi; asli Postgres mein primary ki disk bach jaaye toh write primary ki disk par milta.",
            "choiceExplanations": [
              "Async ka \"ho gaya\" sirf primary ka hai. Lab mein primary aakhri write ke turant baad mara: paas replica ka 1 ms ka packet bhi nahi pahuncha → 1 write gaya; door replica primary banta toh 27–28 (30 ms ke packets). Lab mein disk nahi; asli Postgres mein primary ki disk bach jaaye toh write primary ki disk par milta.",
              "Replica ko packet mila hi nahi; phenkne ka sawaal nahi.",
              "Lab ka client har write ek baar bhejta hai."
            ]
          }
        },
        {
          "title": "Sync-all",
          "clock": "sync-all",
          "say": "Ab primary dono replicas ke ack ka intezaar karta hai, phir \"ho gaya\".",
          "nodes": {
            "client": {
              "tone": "acc",
              "badge": "intezaar"
            },
            "primary": {
              "tone": "ok",
              "badge": "likha"
            },
            "near": {
              "tone": "ok",
              "badge": "ack 2 ms"
            },
            "far": {
              "tone": "busy",
              "badge": "ack 60 ms"
            }
          },
          "vars": {
            "mode": "sync-all",
            "lat": "60.63–60.76 ms",
            "lost": "0"
          },
          "flows": [
            {
              "from": "near",
              "to": "primary",
              "label": "ack",
              "tone": "ok"
            },
            {
              "from": "far",
              "to": "primary",
              "label": "ack",
              "tone": "busy"
            }
          ],
          "ask": {
            "q": "Sync-all ki latency ~60 ms kyun hai?",
            "choices": [
              "Sabse dheema replica: door wale ka round trip 2 × 30 ms",
              "Primary har write ko 60 ms tak apni disk par likhta hai",
              "Dono replicas ke delay jud jaate hain: 1 + 30 + 30 ms"
            ],
            "answer": 0,
            "hint": "\"Dono ka ack\" ka matlab — kiska intezaar sabse lamba?",
            "explain": "Dono ack chahiye, toh client sabse dheeme ack ka intezaar karta hai: door replica ka round trip 2 × 30 ms ≈ 60 ms. Copies ek saath (parallel) jaati hain, isliye delays jud'te nahi. Partition nahi, phir bhi copy ka intezaar = latency. Dhyaan: ex2 sirf copies ka intezaar aur copy bachna naapta hai; PACELC ka C reads aur writes ke kram ka vaada hai, jiske liye padhne ka niyam aur safe failover bhi chahiye.",
            "choiceExplanations": [
              "Dono ack chahiye, toh client sabse dheeme ack ka intezaar karta hai: door replica ka round trip 2 × 30 ms ≈ 60 ms. Copies ek saath (parallel) jaati hain, isliye delays jud'te nahi. Partition nahi, phir bhi copy ka intezaar = latency. Dhyaan: ex2 sirf copies ka intezaar aur copy bachna naapta hai; PACELC ka C reads aur writes ke kram ka vaada hai, jiske liye padhne ka niyam aur safe failover bhi chahiye.",
              "Lab ke primary mein disk nahi; samay network ke round trip ka hai.",
              "Copies parallel jaati hain; sabse lamba wait ginta hai, jod nahi."
            ]
          }
        },
        {
          "title": "Sync-any-1",
          "clock": "any-1",
          "say": "Niyam: kisi bhi ek replica ka ack kaafi (Postgres mein <code>ANY 1 (…)</code> jaisa).",
          "nodes": {
            "client": {
              "tone": "ok",
              "badge": "ho gaya"
            },
            "primary": {
              "tone": "ok",
              "badge": "likha"
            },
            "near": {
              "tone": "ok",
              "badge": "ack 2 ms"
            },
            "far": {
              "tone": "busy",
              "badge": "baad mein"
            }
          },
          "vars": {
            "mode": "sync-any-1",
            "lat": "2.23–2.24 ms",
            "lost": "0 (door bane: 23–25)"
          },
          "ask": {
            "q": "Sync-any-1 mein bhi door replica ko primary banaya toh 23–25 writes gaye. Sabak?",
            "choices": [
              "Failover mein sabse aage wala replica primary bane",
              "Sync-any-1 bekaar hai; hamesha sync-all hi rakho",
              "Door replica ko hata do; paas wala replica kaafi hai"
            ],
            "answer": 0,
            "hint": "Ack kis replica ne diya tha?",
            "explain": "Har acked write kam se kam ek replica par hai — paas wale par, jisne pehle ack diya. Failover mein agar door wala (piche chal raha) primary bana, toh un writes ki copy door wale replica ke paas nahi. Isliye failover ka niyam: sabse aage wala replica chuno. Latency sabse tez replica jitni (~2.2 ms), suraksha tab tak jab failover sahi replica chune.",
            "choiceExplanations": [
              "Har acked write kam se kam ek replica par hai — paas wale par, jisne pehle ack diya. Failover mein agar door wala (piche chal raha) primary bana, toh un writes ki copy door wale replica ke paas nahi. Isliye failover ka niyam: sabse aage wala replica chuno. Latency sabse tez replica jitni (~2.2 ms), suraksha tab tak jab failover sahi replica chune.",
              "Sync-all har write ko 60 ms deta hai; any-1 sahi failover ke saath 0 kho raha tha.",
              "Door replica doosre region mein data bachaata hai; hataana suraksha ghataata hai."
            ]
          }
        }
      ],
      "lesson": "Partition na ho tab bhi har write par chunna hai: jaldi \"ho gaya\" (L) ya copies ka intezaar (C ki taraf ek kadam). Sync-all = sabse dheema replica. Sync-any-1 = sabse tez, par failover sahi replica chune. Lab sirf acks aur copies naapta hai; strong consistency ke liye padhne ka niyam aur safe failover bhi chahiye."
    },
    {
      "type": "cards",
      "title": "🪞 Replica se padhna: teen ajeeb baatein",
      "goal": "Lab 58 ex3 (model, seeded): primary + 3 replicas, lag 0–200 ms / 0–1 s / 0–5 s. Load balancer har read random replica par bhejta hai. Har sawaal 10,000 baar. Session guarantees (Terry et al., 1994).",
      "lesson": "Replica se padhne par teen galtiyan aati hain: apna likha na dikhna, samay ka peeche jaana, jawab bina sawaal. Har ek ka ilaaj alag hai aur har ilaaj ki keemat hai (primary par load, ya kuch der chhupana).",
      "steps": [
        {
          "title": "1. Read-your-writes",
          "say": "Bio badla, 300 ms baad profile kholi: <b>54.6%</b> baar purani bio. Ilaaj: write ke baad version token — sirf tumhare version wala replica, warna primary. Keemat: 54.6% reads primary par. \"5 s tak primary\" bhi chalta hai, par sirf tab jab lag 5 s se kam ho.",
          "ask": {
            "q": "\"Write ke baad session ko ek replica par chipka do\" — kab fail hota hai?",
            "choices": [
              "Jab chipke replica mein write abhi nahi pahuncha, ya replica badla",
              "Kabhi nahi — ek replica par chipakna hamesha apna likha dikhata hai",
              "Jab doosre users bhi us replica par aa jaayein"
            ],
            "answer": 0,
            "hint": "Chipakne se kya guarantee milti hai, aur kya nahi?",
            "explain": "Chipakna sirf \"hamesha same replica\" deta hai, \"replica mein mera write hai\" nahi. Agar chipka hua replica lag mein hai ya failover mein badal gaya, purana data dikhega. Version token seedha poochta hai: kya is replica mein mera version hai? Lab: token ke saath purani bio 0.",
            "choiceExplanations": [
              "Chipakna sirf \"hamesha same replica\" deta hai, \"replica mein mera write hai\" nahi. Agar chipka hua replica lag mein hai ya failover mein badal gaya, purana data dikhega. Version token seedha poochta hai: kya is replica mein mera version hai? Lab: token ke saath purani bio 0.",
              "Replica lag mein ho toh chipakne ke bawajood purana data dikhta hai.",
              "Doosre users ke aane se tumhara write nahi badalta."
            ]
          }
        },
        {
          "title": "2. Monotonic reads",
          "say": "Score har 0.5 s badla, viewer ne 10 baar refresh kiya: random replica par <b>95.4%</b> viewers ne kam se kam ek baar score <b>peeche</b> jaate dekha (pehle tez replica, phir dheema). Ilaaj: ek replica se chipko, ya \"dekhe hue version se naya\" token → 0."
        },
        {
          "title": "3. Causal",
          "say": "Sawaal shard Q par, jawab 2 s baad shard A par (alag lag). Reader ko <b>4.5%</b> baar jawab dikha par sawaal nahi. Ilaaj: jawab ke saath likho \"sawaal v1 chahiye\"; sawaal na dikhe toh jawab chhupao → 0; keemat: 448 baar jawab thodi der chhupa.",
          "ask": {
            "q": "Session guarantees ke baare mein kaunsi baat sahi hai?",
            "choices": [
              "Har guarantee alag: read-your-writes se monotonic reads nahi milta",
              "Sirf read-your-writes mil jaaye toh monotonic reads bhi pakka milta hai",
              "Strong consistency ke bina koi bhi session guarantee nahi mil sakti"
            ],
            "answer": 0,
            "hint": "Lab ex3 mein har galti ka ilaaj alag tha ya ek hi?",
            "explain": "Terry et al. (1994) ki session guarantees (read-your-writes, monotonic reads, writes-follow-reads, monotonic writes) alag-alag hain. Lab mein read-your-writes ka token alag tha, monotonic ka alag, causal ka dependency alag. Strong consistency sab deti hai, par har guarantee kam keemat par alag se bhi mil sakti hai. Poori causal session in guarantees ko jodti hai; lab ka sawaal→jawab filter sirf ek dependency dikhata hai.",
            "choiceExplanations": [
              "Terry et al. (1994) ki session guarantees (read-your-writes, monotonic reads, writes-follow-reads, monotonic writes) alag-alag hain. Lab mein read-your-writes ka token alag tha, monotonic ka alag, causal ka dependency alag. Strong consistency sab deti hai, par har guarantee kam keemat par alag se bhi mil sakti hai. Poori causal session in guarantees ko jodti hai; lab ka sawaal→jawab filter sirf ek dependency dikhata hai.",
              "Read-your-writes apne writes ka vaada hai; doosre writes ka peeche jaana rokna alag vaada hai.",
              "Lab ne strong consistency ke bina tokens aur dependencies se teeno galtiyan 0 ki."
            ]
          }
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Replication ki latency aur replica reads",
      "project": "58-cap",
      "exercise": "ex2-pacelc",
      "goal": "ex2: async / sync-any-1 / sync-all ki latency aur primary crash. ex3: replica lag par teen galtiyan aur ilaaj ki keemat.",
      "why": "Node 24+ chahiye. ex2 ke timers asli (network delay model); ex3 seeded, har run same.",
      "steps": [
        {
          "text": "Lab folder se: PACELC.",
          "cmd": "cd docker-labs/58-cap && npm start -- ex2-pacelc",
          "expect": "A. Latency — 200 writes ek ke baad ek (har write ka \"ho gaya\" aane tak ka samay)\n  async        median   0.00 ms   p99   0.03 ms\n  sync-any-1   median   2.23 ms   p99   2.83 ms\n  sync-all     median  60.63 ms   p99  61.11 ms\n\nB. Primary mara — 300 writes (har 1 ms ka target), 300va write bhejte hi crash; \"ho gaya\" bole gaye writes mein se kitne kho gaye?\n   Mara primary kisi ko jawab nahi deta: crash ke baad aane wale acks ke writes ko \"ho gaya\" nahi milta (natija pata nahi).\n  async        crash t = 333 ms   \"ho gaya\" bola 300   naya primary = paas (1 ms)   naye primary mein nahi:  1   (agar door wala bane: 27)\n  sync-any-1   crash t = 334 ms   \"ho gaya\" bola 298   naya primary = paas (1 ms)   naye primary mein nahi:  0   (agar door wala bane: 25)\n  sync-all     crash t = 335 ms   \"ho gaya\" bola 246   naya primary = paas (1 ms)   naye primary mein nahi:  0   (agar door wala bane: 0)\n\nasync: tez, par crash par aakhri writes (packet raaste mein the) gaye. sync-all: latency = sabse dheema replica (~60 ms).\nsync-any-1: latency ~ sabse tez replica; acked write kam se kam ek replica par — us replica ko primary banao."
        },
        {
          "text": "Session guarantees.",
          "cmd": "npm start -- ex3-session",
          "expect": "Replica lag (har write par random): 0–200 ms, 0–1000 ms, 0–5000 ms. Har sawaal 10,000 baar.\n\na) Read-your-writes — bio badla, 300 ms baad apni profile kholi\n   bina ilaaj                  purani bio dikhi: 5,456 (54.6%)\n   5 s tak primary se padho    purani bio: 0      primary par reads: 10,000 (100.0%)\n   version token               purani bio: 0      primary par reads: 5,456 (54.6%)  (baaki replica se)\n\nb) Monotonic reads — score har 0.5 s badla, viewer ne 10 baar refresh kiya (har second)\n   random replica              kam se kam ek baar score PEECHE gaya: 9,539 (95.4%) viewers\n   ek hi replica se chipko     0\n   \"dekhe hue version se naya\" token0\n\nc) Causal — sawaal (shard Q, t = 0), jawab (shard A, t = 2 s); reader 2–6 s ke beech dono padhta hai\n   bina ilaaj                  jawab dikha, sawaal nahi: 448 (4.5%)\n   jawab ke saath \"sawaal v1 chahiye\"   0 — 448 baar jawab thodi der chhupa raha"
        }
      ],
      "observe": {
        "q": "ex2 B mein sync-all ne sirf 246–247 writes ko \"ho gaya\" bola, async ne 300 ko. Baaki writes ka kya hua?",
        "choices": [
          "Door wala ack aane se pehle primary mara; un writes ko \"ho gaya\" mila hi nahi",
          "Baaki writes kho gaye aur client ko jhooth bola gaya",
          "Sync-all ne baaki writes jaan-boojh kar phenk diye taaki latency kam rahe"
        ],
        "answer": 0,
        "hint": "Sync-all \"ho gaya\" kab bolta hai?",
        "explain": "Sync-all dono acks ke baad hi \"ho gaya\" bolta hai. Aakhri ~53 writes ka door wala ack (60 ms) aane se pehle primary mara, toh un writes ka jawab client ko mila hi nahi — client retry kar sakta hai. \"Ho gaya\" bole gaye kisi write ka nuksaan 0. Jhooth na bolna = jawab der se ya na milna.",
        "choiceExplanations": [
          "Sync-all dono acks ke baad hi \"ho gaya\" bolta hai. Aakhri ~53 writes ka door wala ack (60 ms) aane se pehle primary mara, toh un writes ka jawab client ko mila hi nahi — client retry kar sakta hai. \"Ho gaya\" bole gaye kisi write ka nuksaan 0. Jhooth na bolna = jawab der se ya na milna.",
          "Client ko \"ho gaya\" nahi mila, toh jhooth nahi bola gaya; nuksaan 0.",
          "Sync-all koi write nahi phenkta; jawab sirf intezaar mein tha."
        ]
      },
      "lesson": "Sync replication ki keemat latency hai; async ki keemat crash par kho jaane wale acked writes. Replica reads mein har ajeeb baat ka apna ilaaj hai."
    }
  ],
  "interview": {
    "title": "Interview Round — PACELC",
    "instructions": "Pehle socho: write kitni jagah pakka hona chahiye, aur client kitna intezaar kar sakta hai? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Payments DB: primary Mumbai, standbys Mumbai (doosra AZ) aur Singapore. Har payment ka \"ho gaya\" Singapore ka intezaar kare toh p99 bahut badh gaya. Business shart: primary host fail ho toh payment bache; poore Mumbai region ke jaane par haal ke payments ka risk maana hai. Kya karoge?",
        "choices": [
          "\"ANY 1\": ek standby ka ack; failover sirf aage wale standby ko",
          "Async kar do — Singapore ka intezaar khatam, aur payments ke liye risk chhota hai",
          "Singapore standby hata do — ek hi region kaafi hai",
          "Har payment do baar likho taaki ek kho jaaye toh doosra bache"
        ],
        "answer": 0,
        "explain": "Sync-all ki latency sabse dheeme replica ki hai (lab ex2: ~60 ms door replica ke saath). ANY 1 se latency sabse tez standby jitni (~2 ms), aur har acked write kam se kam ek standby par. Shart: failover mein sabse aage wala standby chuno (lab: door wala bana toh 23–25 writes gaye). Mumbai ki dono copies jaayein toh Singapore peeche ho sakta hai — is wajah se business ne region-loss ka risk maana; zero loss chahiye toh Singapore ka intezaar chhod nahi sakte.",
        "choiceExplanations": [
          "Sync-all ki latency sabse dheeme replica ki hai (lab ex2: ~60 ms door replica ke saath). ANY 1 se latency sabse tez standby jitni (~2 ms), aur har acked write kam se kam ek standby par. Shart: failover mein sabse aage wala standby chuno (lab: door wala bana toh 23–25 writes gaye). Mumbai ki dono copies jaayein toh Singapore peeche ho sakta hai — is wajah se business ne region-loss ka risk maana; zero loss chahiye toh Singapore ka intezaar chhod nahi sakte.",
          "Async mein crash par acked payment kho sakta hai (lab: 1, door wale par 27–28).",
          "Doosra region hataana region-wide aafat mein data bachane ka raasta khatam karta hai.",
          "Do baar likhne se copy nahi banti; dohra payment ka khatra."
        ]
      },
      {
        "q": "User ne profile photo badli, refresh par purani photo dikhi (wajah: replica lag), user ne dobara upload kiya. Team baaki reads replicas par rakhna chahti hai aur primary ka load kam. Ilaaj?",
        "choices": [
          "Read-your-writes: version token, purane replica se mat padho",
          "Replication lag ko zero kar do — sabse tez network lagao",
          "Saare reads primary se karo, hamesha ke liye, sab users",
          "Cache hata do — purani photo sirf cache se aati hai"
        ],
        "answer": 0,
        "explain": "Lag kabhi zero nahi hota. Read-your-writes sirf us user ke liye taaza data maangta hai: token batata hai ki kaunsa replica kaafi naya hai. Lab ex3: bina ilaaj 54.6% purani bio, token ke saath 0 (54.6% reads primary par). Hamesha primary = replicas par read scaling khatam.",
        "choiceExplanations": [
          "Lag kabhi zero nahi hota. Read-your-writes sirf us user ke liye taaza data maangta hai: token batata hai ki kaunsa replica kaafi naya hai. Lab ex3: bina ilaaj 54.6% purani bio, token ke saath 0 (54.6% reads primary par). Hamesha primary = replicas par read scaling khatam.",
          "Lag ghatta hai, khatam nahi; lab mein 5 s tak lag wala replica tha.",
          "Primary routing stale read bachati hai, par har read primary par bhejne se \"primary ka load kam\" ki shart tootti hai.",
          "Sawaal mein wajah replica lag hai; cache hataane se replica jaldi nahi pakdega."
        ]
      }
    ]
  },
  "success": [
    "PACELC ka E latency ke numbers se samjha sakte ho",
    "Sync-any-1 ka failover wala kaanta bata sakte ho",
    "Read-your-writes, monotonic aur causal ke ilaaj chun sakte ho"
  ],
  "cards": [
    {
      "front": "PACELC?",
      "back": "Abadi (2010/2012): Partition ho toh Availability ya Consistency; Else (normal din) Latency ya Consistency. Lab 58 ex2: sync-all ~60.6 ms, sync-any-1 ~2.2 ms, async ~0."
    },
    {
      "front": "Async replication ka khatra?",
      "back": "\"Ho gaya\" sirf primary ka. Lab 58 ex2: crash par 1 acked write gaya (door replica primary bane toh 27–28)."
    },
    {
      "front": "Read-your-writes ka ilaaj?",
      "back": "Version token: sirf user ke version wala replica, warna primary. Lab 58 ex3: bina ilaaj 54.6% purani bio; token ke saath 0."
    }
  ]
}
]);
})();
