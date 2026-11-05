/* First Principles — FAANG Senior Engineer.
   Source credit: The Physics of Software (dDOKu20juEc), numbered video 1/15.
   Evidence: docker-labs/45-software-physics/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "app", "icon": "🍽️", "label": "KhanaKart", "x": 140, "y": 105}, {"id": "path", "icon": "🛣️", "label": "raasta", "x": 445, "y": 105}, {"id": "data", "icon": "🗃️", "label": "data", "x": 750, "y": 105}];
const EDGES = [{"from": "app", "to": "path"}, {"from": "path", "to": "data"}];
VISUALS["fp-physics-kab"] = { t: 'Pehle bottleneck naapo, phir experiment chuno. Line badi karna kaam ki raftaar nahi badhata.',
  html: SD.viz.svg(HERO, EDGES, {nodes:{app:{tone:'acc',badge:'pehle naapo'},path:{tone:'slow',badge:'asli bottleneck'},data:{tone:'ok',badge:'origin ka kharcha'}}}, {w:890,h:215}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-physics-kab",
  "icon": "⚖️",
  "group": "🧪 Physics of Software",
  "title": "Physics 4 · Kab — sahi bottleneck, sahi experiment",
  "badge": "Seema Sochak",
  "objectives": [
    "Bottleneck ka pehla experiment kaise chunein?",
    "Warm file benchmark ki actual hadd kya hai?",
    "Hot subset aur origin ka cost saath kaise ginte hain?",
    "Queue slots badhaana processing capacity kyun nahi?"
  ],
  "lesson": [
    "<h3>⚖️ Menu dheema hai. Server bada kar dein?</h3><p>Door counter tak baar-baar jaane wale runner ko badi almari dene se chakkar nahi ghatte. KhanaKart ko pehle pata karna hai: wait, bytes, worker ya working set?</p>"
  ],
  "stages": [
    {
      "type": "bins",
      "title": "⚖️ Pehla badlaav kis taraf?",
      "instructions": "Har situation ke dominant kharche ko dekho. Di hui condition ke liye pehla experiment chuno.",
      "bins": [
        {
          "id": "batch",
          "label": "📦 Chakkar ghataao"
        },
        {
          "id": "bytes",
          "label": "🚰 Bytes ka raasta"
        },
        {
          "id": "queue",
          "label": "🍳 Kaam aur admission"
        },
        {
          "id": "measure",
          "label": "🔬 Pehle sahi naap"
        }
      ],
      "items": [
        {
          "text": "Independent menu keys pehle se pata hain; har key ka alag remote reply wait hai",
          "bin": "batch",
          "explain": "Bounded batch/API shape ka experiment. Same values aur errors check karo."
        },
        {
          "text": "Badi media file hai; measured link transfer saturation dominant hai",
          "bin": "bytes",
          "explain": "Payload compression/size aur available throughput dekho. Sirf query CPU badalne se link nahi badalta."
        },
        {
          "text": "Ek worker busy hai, line badh rahi hai; sirf queue slots badhaane ka proposal hai",
          "bin": "queue",
          "explain": "Useful processing capacity, work per item aur admission/load shedding dekho. Queue memory alone throughput nahi badhati."
        },
        {
          "text": "Warm local file read se raw SSD random latency declare kar rahe hain",
          "bin": "measure",
          "explain": "Cache/device boundary galat hai. Controlled device benchmark chahiye; warm reads ka result alag hai."
        },
        {
          "text": "Sab user profiles ko RAM mein copy karne ka proposal hai; hot set aur memory budget pata nahi",
          "bin": "measure",
          "explain": "Access frequency, working set, stale-data policy aur cost components pehle maapo."
        },
        {
          "text": "Ek read ka reply agle read ki key batata hai; independent batch assume kiya",
          "bin": "measure",
          "explain": "Dependency/API shape samjho. Unknown keys ko seedhe ek batch mein nahi bhej sakte."
        },
        {
          "text": "Large payload ka serialization time measured total mein bada hissa hai",
          "bin": "bytes",
          "explain": "Fewer bytes ya more usable bandwidth ka controlled comparison karo."
        },
        {
          "text": "Har user ko parallel calls di, ab shared service overload ho rahi hai",
          "bin": "queue",
          "explain": "Per-call cap fleet-wide budget nahi. Admission, total concurrency aur useful completions gino."
        }
      ],
      "lesson": "🎯 <b>Asli baat:</b> Jo kharcha dominant hai, pehla experiment usi par karo. Har bottleneck ka ilaaj more servers nahi."
    },
    {
      "type": "cards",
      "title": "💾 Seedhe blocks tez, random blocks dheeme — hamesha?",
      "goal": "tools/io.js ke teen actual runs. <a href=\"https://www.kernel.org/doc/html/latest/mm/page_cache.html\" target=\"_blank\" rel=\"noopener\">Linux ki official page-cache documentation</a> bhi padhi. Lab normal file reads karta hai; raw SSD/HDD timing nahi.",
      "steps": [
        {
          "title": "1. Kirana shelf ko seedha padho ya idhar-udhar?",
          "say": "Shelf ke saare dibbe chahiye toh ek row mein jaana aasan ho sakta hai. Sirf chune hue dibbe chahiye toh poori shelf padhna bhi waste ho sakta hai. Computer mein bhi access pattern, kaam ka size aur hardware saath dekhte hain."
        },
        {
          "title": "2. Test ne exactly kya kiya?",
          "say": "Tool ne 4 MiB temporary file banayi. File ko pehle <code>readFile</code> se padha: deliberate warmup. Phir same blocks ko sequential 4 KiB, shuffled 4 KiB aur sequential 64 KiB reads se padha. Bytes aur sampled checksum match kiye.",
          "ask": {
            "q": "Warm file read ka time kya seedha physical SSD read time hai?",
            "choices": [
              "Garam file ki reads OS ke page cache se aa sakti hain",
              "File API har read ko seedha SSD tak bhejti hai",
              "Node ki aam file reads OS ka cache bypass karti hain",
            ],
            "answer": 0,
            "explain": "Aam file reads Linux ke page cache se aa sakti hain — warmup ke baad aksar aati hain. Garam reads se SSD ka asli raw samay mat nikaalo. (Cache bypass karne ke liye O_DIRECT jaisi alag shartein chahiye.)",
            "hint": "Warmup aur normal read ka path dekho.",
            "choiceExplanations": [
              "Aam file reads Linux ke page cache se aa sakti hain — warmup ke baad aksar aati hain. Garam reads se SSD ka asli raw samay mat nikaalo. (Cache bypass karne ke liye O_DIRECT jaisi alag shartein chahiye.)",
              "Buffered API har read par SSD tak jaane ka vaada nahi karti.",
              "Node ki aam reads bhi OS cache se hi guzarti hain.",
            ],
          }
        },
        {
          "title": "3. Shuffled reads actual run mein dheemi nikli?",
          "say": "<div class=\"dr-scroll\"><table><tr><th>Case</th><th>3 runs ka elapsed</th><th>Node reads</th></tr><tr><td>seq4k</td><td>43.60–49.62 ms</td><td>1024</td></tr><tr><td>shuffle4k</td><td>41.92–43.15 ms</td><td>1024</td></tr><tr><td>seq64k</td><td>3.09–3.79 ms</td><td>64</td></tr></table></div>Is environment mein shuffled 4 KiB dheemi nahi nikli. Ek catchy rule ko data ke upar mat rakho."
        },
        {
          "title": "4. 64 KiB scan se kya prove hua?",
          "say": "Same bytes par Node read operations 1024 se 64 hui. Larger chunks aur fewer calls ka combined result mila. Is result se raw SSD sequential/random ratio, cold-cache speed ya device IOPS nahi nikla. Device, cache state, block size, queue depth aur competing load control karna padega."
        },
        {
          "title": "5. Storage engine par is idea ko kaise lagayein?",
          "say": "<a href=\"https://github.com/facebook/rocksdb/wiki/RocksDB-Overview\" target=\"_blank\" rel=\"noopener\">RocksDB ki official documentation</a> ke mutabiq log/memtable, sorted files aur compaction milkar kaam karte hain. Sirf \"LSM append karta hai\" kehna adhoora hai. Read, write aur space ka tradeoff hota hai. <b>RocksDB is lab mein chalaya nahi gaya.</b> NoSQL ka label storage-engine benchmark nahi."
        }
      ],
      "lesson": "🎯 <b>Asli baat:</b> Workload aur measurement boundary saaf rakho. Warm file results ko hardware ki universal latency table mat banao."
    },
    {
      "type": "cards",
      "title": "🏠 Garam samaan paas rakho. Sab kuch?",
      "goal": "tools/math.js ka HISAAB: invented cost units. Koi AWS price, currency ya dollar saving nahi. Origin ki 100 GiB copy dono designs mein rahegi.",
      "steps": [
        {
          "title": "1. Dhabe ka roz ka samaan aur purane bills",
          "say": "Roz ki chai-patti counter ke paas chahiye. Purane receipts thodi der mein nikaal sakte hain, agar business ka access-time promise allow kare. Par receipt ka authoritative record bachna chahiye; cache record ka replacement apne aap nahi."
        },
        {
          "title": "2. Cost practice ke inputs kya maane?",
          "say": "Origin 100 GiB. Hot subset 5 GiB. Kalpanik origin rate 1 unit/GiB, cache rate 20 units/GiB. Ye rates seekhne ke knobs hain, market ratios nahi.",
          "ask": {
            "q": "Poora 100 GiB RAM cache bana diya. Kya origin copy ka bill hata sakte hain?",
            "choices": [
              "Is design mein pakki origin copy dono haal mein rehti hai",
              "Poora RAM cache ban gaya, toh origin ki zaroorat nahi",
              "Cache mein copy hai, toh origin ka kharcha zero ho gaya",
            ],
            "answer": 0,
            "explain": "Is design mein cache ek extra copy hai, pakka source nahi. RAM cache poora ho tab bhi origin rehta hai — cache udne par data origin se hi aayega. Copy jodna extra storage hai, purana bill khatam nahi.",
            "hint": "Design ka data ownership promise padho.",
            "choiceExplanations": [
              "Is design mein cache ek extra copy hai, pakka source nahi. RAM cache poora ho tab bhi origin rehta hai — cache udne par data origin se hi aayega. Copy jodna extra storage hai, purana bill khatam nahi.",
              "RAM cache restart par udd sakta hai. Pakka source origin hi hai.",
              "Copy rakhne se original ka bill nahi kat-ta — extra kharcha judta hai.",
            ],
          }
        },
        {
          "title": "3. Dono designs ka hisaab?",
          "say": "<pre>Origin 100 + sabka cache 100 × 20 = 2100 units\nOrigin 100 + hot cache 5 × 20 = 200 units</pre>Hot set ko sahi select karna tabhi useful jab access pattern aur stale-data policy allow kare. Cache miss ka fallback aur peak memory bhi plan karo."
        },
        {
          "title": "4. Real cloud ka bill itna seedha hai?",
          "say": "Real cost mein instance size/bundling, replica, request, transfer, backup aur retention bhi aa sakte hain. RAM hamesha ek fixed multiple mehengi hai ya 1% optimization se fixed dollars bachenge: bina scope aur current pricing ke aisa daava mat karo. Application CPU-cache placement bhi arbitrary business field ke naam se set nahi karti."
        }
      ],
      "lesson": "🎯 <b>Asli baat:</b> Data ke access promise aur working set se storage choose karo. Origin, extra copies aur saare cost components gino."
    },
    {
      "type": "docker",
      "title": "💾 File reads aur cost assumptions khud dekho",
      "project": "45-software-physics",
      "exercise": "ex4-io",
      "goal": "Pehla tool actual warm-cache file reads karega aur temporary file saaf karega. Doosra arithmetic hai; cost units kalpanik hain.",
      "why": "Node 18+ chahiye. Neeche ka output isi lab ke captures se hai. Docker compose abhi chalayi nahi gayi.",
      "steps": [
        {
          "text": "App root se actual file-read experiment.",
          "cmd": "cd docker-labs/45-software-physics && node tools/io.js",
          "expect": "ASLI file reads; warm page cache; 4 MiB; disk hardware benchmark NAHI\nseq4k: reads=1024 bytes=4194304 checksum=125690 elapsed=44.42 ms\nshuffle4k: reads=1024 bytes=4194304 checksum=125690 elapsed=43.15 ms\nseq64k: reads=64 bytes=4194304 checksum=125690 elapsed=3.15 ms"
        },
        {
          "text": "Isi lab folder mein transfer, scale aur aakhri cost lines.",
          "cmd": "node tools/math.js",
          "expect": "HISAAB: decimal bytes; fixed wait 40 ms; ideal link; no overhead/queue\n1000 B @ 100 Mbps: 40.080 ms\n1000 B @ 1000 Mbps: 40.008 ms\n1000000 B @ 100 Mbps: 120.000 ms\n1000000 B @ 1000 Mbps: 48.000 ms\nHISAAB: maana 3 GHz; 1 cycle ko 1 human second; 365-day year\n1 cycle = 0.333 ns\n100 ns = 300 human seconds\n150 ms = 14.27 human years\nYEH scenario inputs hain; hardware timings measure nahi kiye.\nHISAAB: kalpanik cost units/GiB: origin=1, cache=20; AWS price NAHI\norigin 100 GiB + sabka cache: 2100 units\norigin 100 GiB + hot 5 GiB cache: 200 units"
        }
      ],
      "observe": {
        "q": "Warm reads aur invented cost units se production SSD ratio aur AWS bill prove ho gaya?",
        "choices": [
          "Local timing aur banaye cost units, dono ki hadd alag hai",
          "Garam timing har SSD ka hardware ratio bata deti hai",
          "Cost units har AWS region ka asli bill hi hain",
        ],
        "answer": 0,
        "explain": "Garam local reads aur banaye hue cost units seemit misaalein hain — production hardware ya pricing ka saboot nahi. Asli SSD ratio hardware, cache aur workload par depend; asli cloud bill service, region, tier aur aaj ke daam par.",
        "hint": "Measured, model aur hisaab ko alag rakho.",
        "choiceExplanations": [
          "Garam local reads aur banaye hue cost units seemit misaalein hain — production hardware ya pricing ka saboot nahi. Asli SSD ratio hardware, cache aur workload par depend; asli cloud bill service, region, tier aur aaj ke daam par.",
          "Garam reads cache se aayi — SSD ka ratio naapa hi nahi gaya.",
          "Units seekhne ke liye banaye gaye the, market ke daam nahi.",
        ],
      },
      "lesson": "Apne run ke changed timings compare karo; condition aur checksum pehle milao."
    },
    {
      "type": "cards",
      "title": "🧭 Design se pehle kaunse sawaal?",
      "goal": "KhanaKart ki next design review mein pehle workload aur evidence maango.",
      "steps": [
        {
          "title": "1. Slow response hai. Bas aur nodes?",
          "say": "Pehle request ke hops aur waits dekho. Agar same remote calls ka path unchanged raha, app nodes badhaane se per-request wait ka root cause zaroori nahi ghatta. Agar processing capacity bottleneck hai toh scaling useful ho sakti hai. Controlled run se compare karo."
        },
        {
          "title": "2. Queue slots badha diye. Capacity badh gayi?",
          "say": "Zyada work hold karna aur zyada useful work complete karna alag hain. Offered, accepted, rejected aur completed rates alag gino. Memory, timeout aur backlog age ko saath dekho. Formula alone positive-feedback collapse prove nahi karta.",
          "ask": {
            "q": "Worker ka kaam unchanged hai. Queue memory double ki. Guaranteed useful throughput double?",
            "choices": [
              "Badi queue bas zyada intezaar wala kaam rakh sakti hai",
              "Dugni memory worker ki raftaar bhi dugni kar deti hai",
              "Queue ki har jagah ek alag worker ki tarah kaam karti hai",
            ],
            "answer": 0,
            "explain": "Bottleneck (worker) wahi hai, toh sirf line ki jagah badhane se poora hone wala kaam dugna nahi hota. Memory kaam ko parallel nahi karti. Line mein khadi jagah worker nahi.",
            "hint": "Holding capacity aur service capacity alag hain.",
            "choiceExplanations": [
              "Bottleneck (worker) wahi hai, toh sirf line ki jagah badhane se poora hone wala kaam dugna nahi hota. Memory kaam ko parallel nahi karti. Line mein khadi jagah worker nahi.",
              "Memory kaam rakhti hai, karti nahi. Worker ki raftaar wahi.",
              "Line mein khadi jagah sirf intezaar karti hai — kaam nahi.",
            ],
          }
        },
        {
          "title": "3. Har number ke saath kya likhein?",
          "say": "Measured result ke saath environment aur conditions. Model ke saath assumptions. Arithmetic ke saath inputs aur units. Official product docs ke saath source aur run hua ya nahi. Average, median aur tail ko exchange mat karo."
        },
        {
          "title": "4. KhanaKart review ka seedha kram?",
          "say": "User ko kaunsa result kab chahiye? Data kahan hai? Kitne requests/bytes/work items? Waqt kahan laga? Safe completion capacity kitni? Extra copies ka cost aur freshness promise kya? Phir architecture ke boxes banao."
        }
      ],
      "lesson": "🎯 <b>Asli baat:</b> Pehle workload, path aur guarantee. Phir measured experiment; uske baad product ya pattern chuno."
    }
  ],
  "interview": {
    "title": "Interview Round — pehle raasta, phir tool",
    "instructions": "KhanaKart ka haal dekho. Phir wajah ke saath jawab chuno. 🎤",
    "questions": [
      {
        "q": "Warm page-cache test mein shuffled reads tez aayi. Sahi conclusion?",
        "choices": [
          "Is garam setup mein shuffled reads tez thi; physical SSD ka ratio nahi naapa",
          "Is SSD par random reads tez hain; same bytes aur checksum ne ratio pakka kiya",
          "Warmup ka waqt bhi jod do; total se physical SSD ka random-read ratio mil jaayega",
        ],
        "answer": 0,
        "explain": "Aam file reads page cache se aa sakti hain. Garam setup ka samay physical SSD ka random aur sequential read ratio nahi batata — SSD ke liye thanda, controlled prayog alag chahiye. Nateeja imaandaari se, us setup ke daayre mein batao.",
        "hint": "Test ne physical I/O count kiya tha?",
        "choiceExplanations": [
          "Aam file reads page cache se aa sakti hain. Garam setup ka samay physical SSD ka random aur sequential read ratio nahi batata — SSD ke liye thanda, controlled prayog alag chahiye. Nateeja imaandaari se, us setup ke daayre mein batao.",
          "Same bytes aur checksum data milne ki jaanch hain — physical device par kitni reads hui, pata nahi chalta.",
          "Warmup ka waqt jodne se cache aur device ka kaam alag nahi hota. Physical SSD ke liye alag controlled test chahiye.",
        ],
      },
      {
        "q": "100 GiB origin + 5 GiB cache design hai. Cache cost calculate karte waqt origin?",
        "choices": [
          "Origin ka kharcha + 5 GiB cache ka extra kharcha, dono gino",
          "Sirf cache ka kharcha — origin ka bill ab cache ne le liya",
          "Sirf origin ka kharcha — cache ki copy muft memory hai",
        ],
        "answer": 0,
        "explain": "Design mein origin ka 100 GiB rehta hai; extra cache ka kharcha alag se jodo. Cache jodne se origin ka kharcha gayab nahi hota — aur RAM/managed cache ka apna kharcha hota hai.",
        "hint": "Cache source of truth automatically nahi.",
        "choiceExplanations": [
          "Design mein origin ka 100 GiB rehta hai; extra cache ka kharcha alag se jodo. Cache jodne se origin ka kharcha gayab nahi hota — aur RAM/managed cache ka apna kharcha hota hai.",
          "Origin abhi bhi hai aur abhi bhi bill aata hai.",
          "RAM ya managed cache muft nahi — cache ka bhi kharcha hai.",
        ],
      }
    ]
  },
  "success": [
    "Bottleneck ke hisaab se experiment choose karte ho",
    "Warm file reads ki hadd saaf bata sakte ho",
    "Cache ki extra copy aur origin dono ka cost ginte ho",
    "Queue holding aur useful completion capacity alag rakhte ho"
  ],
  "cards": [
    {
      "front": "Sequential/random ka universal ratio?",
      "back": "Nahi. Device, cache, block size, queue depth aur workload define karke measure karo."
    },
    {
      "front": "Queue memory double = throughput double?",
      "back": "Nahi. Zyada waiting capacity worker ka work per item kam nahi karti."
    },
    {
      "front": "Cost arithmetic mein cache?",
      "back": "Extra copy. Authoritative origin ka bill aur durability promise alag se rehte hain."
    }
  ]
}
]);
})();
