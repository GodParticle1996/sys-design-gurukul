/* First Principles — FAANG Senior Engineer.
   Source credit: The Physics of Persistence: B-Trees vs LSM-Trees (RAuIWs3ne9g), numbered video 5/15.
   Evidence: docker-labs/55-persistence/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "bt", "icon": "🌳", "label": "B-tree", "x": 150, "y": 70}, {"id": "lsm", "icon": "🪵", "label": "LSM-tree", "x": 150, "y": 220}, {"id": "ssd", "icon": "💽", "label": "SSD", "x": 640, "y": 145}];
const EDGES = [{"from": "bt", "to": "ssd"}, {"from": "lsm", "to": "ssd"}];
VISUALS["fp-per-kab"] = { t: "Ek engine jagah par badalta hai, doosra sirf aakhir mein jodta hai. Dono ke neeche SSD apna log chalati hai.", html: SD.viz.svg(HERO, EDGES, { nodes: { bt: {tone:'acc',badge:'jagah par'}, lsm: {tone:'busy',badge:'append'}, ssd: {tone:'ok',badge:'flash'} } }, {w:890,h:290}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-per-kab",
  "icon": "💾",
  "group": "💾 Physics of Persistence",
  "title": "Persistence 4 · Kab — B-tree, LSM, SSD aur pakkapan ki seedhi",
  "badge": "Storage Sutradhaar",
  "objectives": [
    "B-tree aur LSM-tree mein likhne aur padhne ka bill kahan hai?",
    "Bloom filter kya bachata hai, aur bhari SSD kyun dheemi?",
    "Kis data ko kitna pakka rakhna hai?"
  ],
  "lesson": [
    "<h3>🏬 Godown ke do tareeke</h3><p>Ek godown har cheez seedha sahi rack par rakhta hai — dhoondhna aasaan, par har naya maal rack tak le jaana padta hai. Doosra godown naya maal darwaze ke paas dher mein rakhta hai, aur raat ko dher chhaant ke racks mein milata hai — rakhna tez, chhaantne ka kaam baad mein.</p><p>Pehla B-tree hai, doosra LSM-tree. Aaj lab ke numbers se dekhte hain kis kaam ke liye kaunsa, aur kaunsa data kitna pakka rakhna hai.</p>"
  ],
  "stages": [
    {
      "type": "cards",
      "title": "🌳 B-tree: kitni oonchi, kitne page writes",
      "goal": "B-tree data ko 8 KB pages ke ek chaude, chhote ped mein rakhta hai. Lab 55 ex4 ka model: 100-byte rows (81 per leaf page), inner page mein 512 bachche.",
      "lesson": "B-tree chaude pages se kam levels rakhta hai. Lab ke model mein inner pages RAM mein pinned hon toh lookup ~1 leaf read. Random keys par writes bahut saare 8 KB pages mein bikharti hain.",
      "steps": [
        {
          "title": "1. Chhota ped",
          "say": "1 crore rows: <b>3 levels</b>; saare inner pages milake sirf <b>1.9 MB</b>. 100 crore rows: 4 levels, inner pages 189 MB. Sirf key + pointer wala index ho toh 6,250 crore keys bhi 4 levels mein.",
          "ask": {
            "q": "Lab ka clustered B-tree: restart ke baad inner pages RAM mein pinned hain, leaf cache mein nahi. Ek random row ke liye disk se kitne pages?",
            "choices": [
              "~1 — sirf leaf page; upar ke levels RAM mein pinned hain (lab: 1.00)",
              "3 — har level ke liye ek page, chahe kuch bhi RAM mein ho, hamesha",
              "~0 — B-tree poori table ko hamesha RAM mein hi rakhta hai, disk tak nahi jaata"
            ],
            "answer": 0,
            "hint": "Kaunse pages har lookup mein lagte hain, aur kaunse RAM mein pade hain?",
            "explain": "Root har lookup mein lagta hai, aur saare inner pages milake chhote hain, isliye RAM mein rakhna sasta. Inner pages pinned aur leaf cache mein nahi: disk tak sirf leaf. Lab ex4: 1 page ke pool mein raasta tikta nahi → 3.00 reads per lookup; barabar 65 pages mein seedha LRU 1.57, aur 64 inner pages (0.5 MB) pinned → 1.00. \"Har query 4 disk trips\" sirf thande cache par. PostgreSQL jaisi heap table mein index ke baad heap page ka read bhi jud sakta hai.",
            "choiceExplanations": [
              "Root har lookup mein lagta hai, aur saare inner pages milake chhote hain, isliye RAM mein rakhna sasta. Inner pages pinned aur leaf cache mein nahi: disk tak sirf leaf. Lab ex4: 1 page ke pool mein raasta tikta nahi → 3.00 reads per lookup; barabar 65 pages mein seedha LRU 1.57, aur 64 inner pages (0.5 MB) pinned → 1.00. \"Har query 4 disk trips\" sirf thande cache par. PostgreSQL jaisi heap table mein index ke baad heap page ka read bhi jud sakta hai.",
              "Inner pages ek baar RAM mein aa gaye toh dobara disk se nahi padhne padte.",
              "Leaves poori table hain (1 crore rows ≈ 965 MB); aam taur par sab RAM mein nahi."
            ]
          }
        },
        {
          "title": "2. Ek row, ek page",
          "say": "Random keys: inserts bahut saare leaves mein bikharte hain. Ek gande (dirty) 8 KB page par kai rows jama ho sakti hain, par page poora likha jaata hai. 10 lakh inserts, sirf data-page writes: checkpoint har 1,000 par → <b>75×</b> bytes; har 1 lakh par → <b>8×</b>. Sequential keys → <b>2×</b>. WAL ka ~1× alag.",
          "ask": {
            "q": "Orders ka primary key: random UUID (v4), ya samay ke saath badhne wali ID (jaise UUIDv7)? B-tree par likhne ka bill?",
            "choices": [
              "Badhti ID — naye rows aakhri leaf mein judte hain; random ID har baar alag page gandha karti hai",
              "Random UUID — key bikhri ho toh load har page par barabar bant-ta hai, bill kam hota hai",
              "Koi farq nahi — B-tree har insert par poora ped dobara likhta hai, chahe key kaisi bhi ho"
            ],
            "answer": 0,
            "hint": "Lab ex4 mein random vs sequential keys par page writes?",
            "explain": "Badhti key par naye rows aakhri leaf mein aate hain: ek garam page, kam writes (lab: 2×). Random key har baar kisi alag page ko gandha karti hai (same setting par 66.5×). Time-ordered IDs (jaise UUIDv7) kai workloads mein aisi hi locality dete hain — lab ka nateeja ek model ka hai; apne database par naap ke dekho.",
            "choiceExplanations": [
              "Badhti key par naye rows aakhri leaf mein aate hain: ek garam page, kam writes (lab: 2×). Random key har baar kisi alag page ko gandha karti hai (same setting par 66.5×). Time-ordered IDs (jaise UUIDv7) kai workloads mein aisi hi locality dete hain — lab ka nateeja ek model ka hai; apne database par naap ke dekho.",
              "Bikhra load B-tree par zyada pages gandhe karta hai, kam nahi.",
              "Insert sirf leaf aur zaroorat padne par split wale pages badalta hai, poora ped nahi."
            ]
          }
        },
        {
          "title": "3. B-tree kahan",
          "say": "Leaves sorted kram mein jude hote hain, toh range query (\"aaj ke saare orders\") ek leaf se agle leaf tak chalti hai. MySQL ka InnoDB aur MongoDB ka WiredTiger table ki rows B-tree mein rakhte hain. PostgreSQL ki aam table heap hai; B-tree index alag hota hai."
        }
      ]
    },
    {
      "type": "cards",
      "title": "🪵 LSM, bloom filter aur bhari SSD",
      "goal": "LSM-tree kabhi beech mein nahi badalta: memtable bhari toh ek sorted file (SSTable), aur baad mein files ko milana (compaction). Lab 55 ex5 aur ex6 ke models.",
      "lesson": "LSM ka likhna seedha aur sasta, bill compaction mein. Bloom filter gair-maujood keys ke reads bachata hai. SSD bhi andar se log jaisa likhta hai; bhari drive par copying badhti hai.",
      "steps": [
        {
          "title": "1. Bill kahan hai?",
          "say": "Wahi 10 lakh random rows (100 MB): WAL 100 MB + memtable flush 100 MB + compaction 260 MB = <b>4.6×</b> likha. Is size-tiered model mein unique keys ka kram badalne se 4.6× nahi badla. Real LSM mein key-range overlap, compaction policy, updates aur compression se bill badalta hai.",
          "ask": {
            "q": "LSM mein 4.6× ka sabse bada hissa kahan se aaya?",
            "choices": [
              "Compaction — files milaate waqt wahi rows dobara likhi jaati hain (260 MB)",
              "WAL — har row ka log, kyunki LSM har row ko log mein teen baar likhta hai",
              "Bloom filters — har file ka filter rows se bhi zyada jagah le leta hai"
            ],
            "answer": 0,
            "hint": "Teen hisse: WAL, flush, compaction. Sabse bada?",
            "explain": "WAL 100 MB aur flush 100 MB ek-ek baar. Compaction 260 MB: chhoti files milake badi banti hain, aur ek row kai tiers se guzar ke dobara-dobara likhi jaati hai. LSM ka baad ka kharch compaction mein rows dobara likhna hai.",
            "choiceExplanations": [
              "WAL 100 MB aur flush 100 MB ek-ek baar. Compaction 260 MB: chhoti files milake badi banti hain, aur ek row kai tiers se guzar ke dobara-dobara likhi jaati hai. LSM ka baad ka kharch compaction mein rows dobara likhna hai.",
              "Lab mein har row ek baar log mein gayi: 100 MB = 100 MB rows.",
              "10 bits/key ka filter = 1.25 bytes per key; 100-byte row ke saamne chhota."
            ]
          }
        },
        {
          "title": "2. \"Shayad\" vs \"pakka nahi\"",
          "say": "Har SSTable ka bloom filter (10 bits/key) RAM mein. Missing key ke lookups: bloom ke bina 4.00 block reads; bloom ke saath <b>0.03</b>. 2 lakh gair-maujood keys mein se 0.81% par filter ne \"shayad\" kaha.",
          "ask": {
            "q": "Bloom filter ne kaha \"key is file mein nahi\". Kitna bharosa?",
            "choices": [
              "Poora — \"nahi\" kabhi galat nahi; sirf \"shayad hai\" kabhi-kabhi galat hota hai",
              "99% — kabhi-kabhi file mein key hoti hai par filter galti se \"nahi\" bol deta hai",
              "Kuch nahi — filter sirf andaaza hai, isliye har file phir bhi padhni padti hai"
            ],
            "answer": 0,
            "hint": "Key jodte waqt filter ke bits ka kya hota hai?",
            "explain": "Key jodte waqt key ke hash se chune gaye bits 1 hote hain, aur koi bit kabhi wapas 0 nahi hota. Toh maujood key par filter hamesha \"shayad\" kahega — \"nahi\" sirf gair-maujood key ko. Gair-maujood keys mein se 0.81% par filter ne \"shayad\" kaha (10 bits/key).",
            "choiceExplanations": [
              "Key jodte waqt key ke hash se chune gaye bits 1 hote hain, aur koi bit kabhi wapas 0 nahi hota. Toh maujood key par filter hamesha \"shayad\" kahega — \"nahi\" sirf gair-maujood key ko. Gair-maujood keys mein se 0.81% par filter ne \"shayad\" kaha (10 bits/key).",
              "Galti sirf ek taraf: \"shayad hai\" galat ho sakta hai, \"nahi\" kabhi nahi (lab test har key jaanchta hai).",
              "Lab mein missing key par 4.00 se 0.03 block reads — filter ke \"nahi\" par file padhi hi nahi gayi."
            ]
          }
        },
        {
          "title": "3. Bhari SSD",
          "say": "Flash ek page dobara tabhi likh sakta hai jab poora block erase ho. Overwrite naye page par; purana page \"stale\". Model: 50% physical pages par live data → <b>1.21×</b> flash writes, 90% → <b>5.18×</b>, 95% → <b>10.47×</b>. Sequential overwrite: 1.00×.",
          "ask": {
            "q": "Lab ke FTL model mein 95% physical pages par live data hai. Random overwrite par 10.47× flash writes kyun?",
            "choices": [
              "Saaf-safai (GC) ko har block se zyada live pages copy karne pade — ek host write par ~10 flash writes",
              "Flash cells ghis gaye — 95% par drive har write ko do-teen baar dohra ke pakka karti hai",
              "File system ka index bhar gaya — naye files ke naam rakhne ki jagah khatam ho gayi"
            ],
            "answer": 0,
            "hint": "Bhari drive ke ek block mein kitne pages abhi bhi \"live\" hote hain?",
            "explain": "Bhari drive par har block mein zyada live pages; block erase karne se pehle GC ko live pages copy karne padte hain. Model mein 95% par 10.47× flash writes. Asli SSD par 95% filesystem usage se 10.47× mat maano: drive ki chhupi spare jagah, TRIM aur workload jaancho. Controller ke paas khaali jagah zyada ho toh GC sasta.",
            "choiceExplanations": [
              "Bhari drive par har block mein zyada live pages; block erase karne se pehle GC ko live pages copy karne padte hain. Model mein 95% par 10.47× flash writes. Asli SSD par 95% filesystem usage se 10.47× mat maano: drive ki chhupi spare jagah, TRIM aur workload jaancho. Controller ke paas khaali jagah zyada ho toh GC sasta.",
              "Model mein ghisaai hai hi nahi; ginti sirf GC ki copying ki hai.",
              "Model mein file system nahi; ginti flash ke andar ki copying ki hai."
            ]
          }
        },
        {
          "title": "4. Naam",
          "say": "Chauda, chhota ped jo jagah par badalta hai: <b>B-tree</b>. Sirf aakhir mein jodna aur baad mein milaana: <b>LSM-tree</b> (memtable, SSTable, compaction). \"Shayad hai / pakka nahi\": <b>bloom filter</b>. Ek byte ke liye kai bytes likhna: <b>write amplification</b>. Read cost, update cost aur extra memory/storage ka tradeoff: <b>RUM conjecture</b> — do overheads ko bahut kam karo toh teesre ki ek seema aati hai."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 B-tree, LSM aur SSD ke models",
      "project": "55-persistence",
      "exercise": "ex4-btree",
      "goal": "10 lakh inserts B-tree mein (buffer pool + checkpoint), wahi inserts LSM mein (compaction + bloom), phir SSD ka FTL.",
      "why": "Node 22+ chahiye. Teeno seeded models hain — har run same. ex4 ~20 second chalta hai.",
      "steps": [
        {
          "text": "Lab folder se: B-tree.",
          "cmd": "cd docker-labs/55-persistence && npm start -- ex4-btree",
          "expect": "== A. height (MODEL arithmetic): 8 KB pages, 100-byte rows → 81 rows per leaf; inner entry 16 bytes → 512 children ==\nrows                   levels   leaf pages (full)   inner pages   inner pages in RAM   whole table\n1,00,000                   3               1,235             4               0.0 MB        9.6 MB\n1,00,00,000                3            1,23,457           243               1.9 MB      964.5 MB\n1,00,00,00,000             4         1,23,45,680        24,162             188.8 MB       94.2 GB\n62,50,00,00,000            5        77,16,04,939     15,09,992              11.5 GB     5886.9 GB\nIndex holding only key + pointer (16 bytes, 512 per leaf): 62,50,00,00,000 keys → 4 levels.\nKeep the inner pages in RAM and a lookup reads ONE page from disk (the leaf), not one per level.\n\n== B. 10,00,000 inserts of 100-byte rows (MODEL, LRU buffer pool, dirty pages written on eviction or checkpoint) ==\nkeys        pool            checkpoint every   page reads   page writes   bytes written ÷ row bytes   height   leaf fill\nrandom      1,000 pages               10,000     7,79,289      8,11,326                        66.5×        3         70%\nrandom      40,000 pages               1,000            0      9,16,711                        75.1×        3         70%\nrandom      40,000 pages              10,000            0      5,37,579                        44.0×        3         70%\nrandom      40,000 pages            1,00,000            0        97,789                         8.0×        3         70%\nsequential  1,000 pages               10,000            0        24,775                         2.0×        3         51%\nPool 1,000 pages = 8 MB; 40,000 pages = 320 MB (the whole tree fits). Plus the WAL: ~1× more.\n\n== C. after a restart: 10,000 random lookups (MODEL; the pool starts empty except pinned pages) ==\nbuffer pool                                   first lookup   average over 10,000\n1 page, nothing pinned                                   3                  3.00 page reads per lookup\n65 pages, plain LRU                                      3                  1.57 page reads per lookup\n64 inner pages pinned + 1 page for leaves                1                  1.00 page reads per lookup\n1,000 pages, plain LRU                                   3                  0.95 page reads per lookup\nOne page cannot hold the root-to-leaf path. Same 65 pages: pinning the inner pages beats plain LRU."
        },
        {
          "text": "LSM aur bloom.",
          "cmd": "npm start -- ex5-lsm",
          "expect": "== 10,00,000 random inserts; memtable 10,000 rows (1 MB); size-tiered compaction, 4 files per tier ==\nuser rows 100 MB → WAL 100 MB + memtable flushes 100 MB + compaction 260 MB = 4.6× written\nfiles now: 4 (tiers: T0:0 T1:1 T2:2 T3:1)\n\nlookups (10,000 each)         files checked   bloom said \"no\"   4 KB block reads   wasted reads (key not in file)\nbloom 10 bits/key  key exists    3.40              2.38               1.02                             0.02\nbloom 10 bits/key  key missing   4.00              3.97               0.03                             0.03\nno bloom           key exists    3.40              0.00               3.40                             2.40\nno bloom           key missing   4.00              0.00               4.00                             4.00\n\n== bloom filter: false positives measured on 1 lakh keys, 2 lakh absent keys ==\n 5 bits per key (3 hashes): 9.00% \"maybe\" for keys that are not there; never \"no\" for a key that is\n10 bits per key (7 hashes): 0.81% \"maybe\" for keys that are not there; never \"no\" for a key that is\n15 bits per key (10 hashes): 0.08% \"maybe\" for keys that are not there; never \"no\" for a key that is\nA full-key bloom filter cannot skip files for an arbitrary range scan; a prefix bloom filter can help scans within one prefix."
        },
        {
          "text": "SSD ka FTL.",
          "cmd": "npm start -- ex6-ssd",
          "expect": "== MODEL: overwrite 4× the stored data; flash writes counted, including garbage collection copies ==\npattern      drive full   host writes   GC copies   flash writes ÷ host writes   block erases\nrandom              50%      2,62,144      53,877                         1.21×            981\nrandom              75%      3,93,216    4,46,459                         2.14×          3,154\nrandom              90%      4,71,856   19,70,678                         5.18×          9,492\nrandom              95%      4,98,072   47,17,548                        10.47×         20,350\nsequential          90%      4,71,856           0                         1.00×          1,794\nFlash cannot overwrite a page in place; GC copies the still-live pages of a block before erasing it.\nFuller drive → fewer stale pages per block → more copying. Sequential overwrites leave whole blocks stale: no copying."
        }
      ],
      "observe": {
        "q": "ex4 mein checkpoint har 1,000 par 75× bytes, har 1 lakh par sirf 8×. Toh checkpoint hamesha door-door rakho?",
        "choices": [
          "Nahi — door checkpoint par crash ke baad replay ke liye log lamba, recovery dheemi",
          "Haan — checkpoint door rakhne ka koi nuksaan nahi, sirf bytes bachte hain",
          "Haan — checkpoint door ho toh crash mein data kam khota hai, isliye aur safe"
        ],
        "answer": 0,
        "hint": "Crash ke baad recovery ko kya padhna padta hai?",
        "explain": "Checkpoint door ho toh ek page par kai rows ikatthi hoti hain, kam bytes likhe jaate hain. Par crash ke baad pichhle checkpoint se ab tak ka poora log replay karna padta hai — recovery dheemi. Databases dono ke beech sauda karte hain.",
        "choiceExplanations": [
          "Checkpoint door ho toh ek page par kai rows ikatthi hoti hain, kam bytes likhe jaate hain. Par crash ke baad pichhle checkpoint se ab tak ka poora log replay karna padta hai — recovery dheemi. Databases dono ke beech sauda karte hain.",
          "Kam bytes ka faayda hai, par recovery ka samay badhta hai.",
          "Pakkapan WAL ke fsync se hai; checkpoint ki doori se data kam ya zyada nahi khota."
        ]
      },
      "lesson": "B-tree random keys par page writes mein mehnga; LSM sasta likhta hai par compaction ka bill bharta hai; bloom filter missing keys ke reads bachata hai; bhari SSD zyada copy karti hai."
    },
    {
      "type": "bins",
      "title": "⚖️ Kitna pakka chahiye?",
      "instructions": "Socho: kis failure ke baad bhi data chahiye? Dobara ban sakta hai toh 🧠. Periodic sync ke beech thoda khona chalega toh 📄. \"Done\" ke baad power cut aur primary machine ka jaana, dono jhelna hai toh 💾.",
      "bins": [
        {
          "id": "ram",
          "label": "🧠 Sirf RAM"
        },
        {
          "id": "os",
          "label": "📄 write(), periodic sync"
        },
        {
          "id": "safe",
          "label": "💾 Durable commit + replica ACK"
        }
      ],
      "items": [
        {
          "text": "Product page ka cache — DB se dobara ban sakta hai",
          "bin": "ram",
          "explain": "Cache khoya toh agli request DB se dobara bana legi. Disk ka bill bekaar."
        },
        {
          "text": "\"Abhi kitne log online hain\" ka counter",
          "bin": "ram",
          "explain": "Restart ke baad counter phir se gin lo; purana maan kisi kaam ka nahi."
        },
        {
          "text": "Debug logs — periodic sync ke beech ke aakhri kuch second jaayein toh chalega",
          "bin": "os",
          "explain": "Har log line par fsync logging ko bahut dheema karega (ex1: 207–806/s). Sync ka interval tay karo; us interval ke beech ke logs khona manzoor."
        },
        {
          "text": "Analytics ke clicks — report mein thode kam gine jaayein toh farq nahi",
          "bin": "os",
          "explain": "Gintiyan andaaze ke liye hain; batch mein likho, power cut ka thoda nuksaan chalega."
        },
        {
          "text": "Order \"placed\" — customer ko confirmation mil chuka hai",
          "bin": "safe",
          "explain": "Confirmation ke baad order khona = customer ka bharosa gaya. \"Done\" tab, jab WAL ka fsync ho (group commit) aur alag machine ki replica durable ACK de. Galat DELETE se wapsi ke liye backups alag."
        },
        {
          "text": "Payment ka ledger entry",
          "bin": "safe",
          "explain": "Paise ka hisaab khona manzoor nahi: durable commit, alag failure domain ki replica ka ACK, checksums, aur backups/PITR."
        },
        {
          "text": "User ka password badalna",
          "bin": "safe",
          "explain": "\"Password badal gaya\" kaha aur restart ke baad purana chal gaya — security ki galti. Durable commit aur replica ACK ke baad hi \"done\"."
        }
      ],
      "lesson": "RAM, write(), fsync aur replica ACK — har policy ka latency, cost aur failure scope alag hai. Pehle tay karo kis failure ke baad data chahiye (power cut, machine, AZ), phir policy chuno aur naapo."
    }
  ],
  "interview": {
    "title": "Interview Round — storage engine chuno",
    "instructions": "Pehle socho: likhna zyada hai ya padhna, keys kaisi hain, aur bill kahan aayega? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Metrics service: 50,000 writes/second, random keys, padhna kabhi-kabhi. B-tree wale DB par disk writes bahut zyada aur latency upar. Kya sochoge?",
        "choices": [
          "LSM jaisa engine — writes aakhir mein judte hain, bill compaction mein; apne workload par naapo",
          "B-tree ka page size 8 KB se 64 KB karo — bade page mein zyada rows, toh writes apne aap kam",
          "Har write par fsync band karo aur B-tree hi rakho — disk writes ki ginti fsync band kiye bina nahi ghategi",
          "Har metric ke liye alag table bana do — har table chhoti rahegi, toh writes bhi chhote honge"
        ],
        "answer": 0,
        "explain": "Random keys par B-tree ke writes bahut saare pages mein bikharte hain (lab ex4: sirf data-page writes 8–75×, WAL ka ~1× alag; same hisaab par ~9–76×). LSM sab kuch aakhir mein jodta hai, sorted files baad mein milata hai (lab ex5: WAL + flush + compaction milake 4.6×). Real engine mein compaction policy aur key overlap se bill badalta hai, toh apna workload naapo. Bill compaction aur kabhi-kabhi ke reads mein — padhna kam hai, toh sauda theek.",
        "choiceExplanations": [
          "Random keys par B-tree ke writes bahut saare pages mein bikharte hain (lab ex4: sirf data-page writes 8–75×, WAL ka ~1× alag; same hisaab par ~9–76×). LSM sab kuch aakhir mein jodta hai, sorted files baad mein milata hai (lab ex5: WAL + flush + compaction milake 4.6×). Real engine mein compaction policy aur key overlap se bill badalta hai, toh apna workload naapo. Bill compaction aur kabhi-kabhi ke reads mein — padhna kam hai, toh sauda theek.",
          "Bada page = har gande page par aur zyada bytes; random keys par bill badh sakta hai.",
          "fsync band karne se pakkapan jaata hai; page writes ki ginti random keys se aati hai.",
          "Hazaaron chhoti tables mein bhi random inserts bahut saare pages ko gandha karte hain."
        ]
      },
      {
        "q": "LSM wale DB par signup ke waqt \"username pehle se liya hua hai?\" check dheema hai — zyada tar naam naye hote hain. Sabse pehle kya dekhoge?",
        "choices": [
          "Bloom filters chalu hain ya nahi, aur bits/key — missing key par filter files padhne se bachata hai",
          "Compaction band kar do — files milaana band hoga toh reads ke liye disk khaali rahegi",
          "Memtable ka size 100 guna karo — sab usernames RAM mein aa jaayenge, disk ki zaroorat nahi",
          "Usernames ko random UUID mein badlo — random keys par LSM ke lookups tez hote hain"
        ],
        "answer": 0,
        "explain": "Naya naam = missing key. Bloom ke bina har file padhni padti (lab ex5: 4.00 block reads); 10 bits/key ke saath 0.03; gair-maujood keys mein se 0.81% par \"shayad\". Pehle filter aur bits/key jaancho.",
        "choiceExplanations": [
          "Naya naam = missing key. Bloom ke bina har file padhni padti (lab ex5: 4.00 block reads); 10 bits/key ke saath 0.03; gair-maujood keys mein se 0.81% par \"shayad\". Pehle filter aur bits/key jaancho.",
          "Compaction band = files badhti jaayengi, aur har lookup aur zyada files dekhega.",
          "Memtable flush hota hi hai; purane naam files mein rahenge, aur bada memtable recovery bhi lamba karta hai.",
          "Key random ho ya nahi, missing key ko har file mein dhoondhna padta hai; filter hi bachata hai."
        ]
      }
    ]
  },
  "success": [
    "B-tree aur LSM ka likhne-padhne ka bill numbers se samjha sakte ho",
    "Bloom filter aur SSD write amplification samjha sakte ho",
    "Data ke hisaab se pakkapan ki policy chun sakte ho"
  ],
  "cards": [
    {
      "front": "B-tree: kitne disk reads per lookup?",
      "back": "Lab ke clustered model mein inner pages pinned (1 crore rows ke liye 1.9 MB) aur leaf cache mein nahi → ~1 leaf read. Lab ex4: 1 page pool 3.00; 65 pages LRU 1.57; pinned 1.00. PostgreSQL heap table: heap page bhi lag sakta hai."
    },
    {
      "front": "B-tree vs LSM likhne ka bill (lab 55)?",
      "back": "B-tree, sirf data-page writes: random 8–75× (checkpoint par depend), sequential 2×; WAL ka ~1× alag. LSM: WAL + flush + compaction milake 4.6× (is model mein key order se farq nahi)."
    },
    {
      "front": "Bloom filter aur bhari SSD?",
      "back": "Bloom 10 bits/key: poore filter ka \"nahi\" pakka; gair-maujood keys mein se 0.81% par \"shayad\". Missing key 4.00 → 0.03 block reads. SSD model: 50% live pages 1.21×, 95% 10.47× flash writes."
    }
  ]
}
]);
})();
