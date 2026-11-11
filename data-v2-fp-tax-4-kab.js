/* First Principles — FAANG Senior Engineer.
   Source credit: The Taxonomy of Storage (mhpinZnH7xI), numbered video 6/15.
   Evidence: docker-labs/56-storage-taxonomy/captures and README.
   Models, arithmetic and measured runs are labelled separately. */
(function () {
const HERO = [{"id": "rel", "icon": "🧮", "label": "Relational", "x": 150, "y": 70}, {"id": "doc", "icon": "📄", "label": "Document", "x": 150, "y": 220}, {"id": "vec", "icon": "🧭", "label": "Vector", "x": 640, "y": 70}, {"id": "geo", "icon": "🌍", "label": "NewSQL", "x": 640, "y": 220}];
const EDGES = [{"from": "rel", "to": "vec"}, {"from": "rel", "to": "geo"}, {"from": "doc", "to": "vec"}];
VISUALS["fp-tax-kab"] = { t: "Sawaal pehle, shape baad mein. Har shape kisi ek sawaal ke liye tez hai.", html: SD.viz.svg(HERO, EDGES, { nodes: { rel: {tone:'ok',badge:'join'}, doc: {tone:'busy',badge:'page'}, vec: {tone:'acc',badge:'IVF'}, geo: {tone:'busy',badge:'61 ms'} } }, {w:890,h:290}) };
SD.registerLevels('fp-core', [
{
  "id": "fp-tax-kab",
  "icon": "🗂️",
  "group": "🗂️ Taxonomy of Storage",
  "title": "Taxonomy 4 · Kab — vector, NewSQL aur sahi shape",
  "badge": "Taxonomy Sutradhaar",
  "objectives": [
    "Vector search mein tezi kahan se aati hai, aur keemat kya?",
    "Distributed SQL ka commit kis cheez ka intezaar karta hai?",
    "Har sawaal ke liye shape kaise chunna?"
  ],
  "lesson": [
    "<h3>🧰 Auzaar ka dabba</h3><p>Mistri ke dabbe mein hathoda, pechkas aur aari hai. Achha mistri pehle kaam dekhta hai — keel, pech ya lakdi — phir auzaar uthata hai. Sirf hathoda rakhne wala har cheez ko keel samajhta hai.</p><p>Aaj aakhri do shapes (vector, NewSQL) naapte hain, phir har sawaal ko sahi auzaar se milaate hain.</p>"
  ],
  "stages": [
    {
      "type": "cards",
      "title": "🧭 \"Is dish jaisi 10 dishes\"",
      "goal": "Misaal: dish ki photo ko numbers (embedding) mein badal ke milti-julti photos dhoondho. Lab 56 ex5 mein asli dish embeddings nahi: seeded random 128-number vectors, 200 jhund, 100 queries. Lab search ka samay aur exact top-10 ke muqaable recall naapta hai, photo relevance nahi. Exact search vs IVF (approximate index: vectors ko 256 groups mein baanto, sirf paas ke groups dekho).",
      "lesson": "Lab ke dono exact baselines (bina filter) har vector se milaate hain; exact ka matlab sahi nearest neighbours, har database mein full scan zaroori nahi. Approximate index thoda recall chhod ke bahut kam comparisons karta hai. Postgres jaise database bhi pgvector se approximate search kar sakte hain.",
      "steps": [
        {
          "title": "1. Sab se milao",
          "say": "1 lakh vectors. Exact, JS mein: <b>17.6–36.4 ms</b> per query. Full-vector scan SQLite mein (user-defined function): <b>212–281 ms</b>. IVF, 256 mein se 1 group: <b>0.21–0.23 ms</b>, recall <b>94%</b> (sahi top 10 mein se ~9.4 mile).",
          "ask": {
            "q": "IVF itna tez kyun, aur keemat kya?",
            "choices": [
              "Sirf ~740 vectors se milata hai (256 centres + paas ka group); keemat: kabhi sahi jawab chhoot-ta",
              "IVF vectors ko compress karta hai, isliye har comparison tez; recall hamesha 100% rehta hai",
              "IVF GPU par chalta hai aur exact search CPU par; dono ke jawab har baar same hote hain"
            ],
            "answer": 0,
            "hint": "1 group mein kitne vectors hain, aur recall 100% kyun nahi?",
            "explain": "Exact: 1 lakh dot products. IVF: pehle 256 centres, phir sabse paas ke group ke ~484 vectors — kul ~740, yaani ~135× kam. Jo sahi padosi doosre group mein pade the, chhoot gaye: recall 94%. 4 groups dekho toh 100% (0.54–0.60 ms).",
            "choiceExplanations": [
              "Exact: 1 lakh dot products. IVF: pehle 256 centres, phir sabse paas ke group ke ~484 vectors — kul ~740, yaani ~135× kam. Jo sahi padosi doosre group mein pade the, chhoot gaye: recall 94%. 4 groups dekho toh 100% (0.54–0.60 ms).",
              "Lab ka IVF compress nahi karta; kam vectors se milata hai, aur recall 94% hai.",
              "Lab mein sab CPU par JS hai; IVF ka jawab exact se thoda alag hai."
            ]
          }
        },
        {
          "title": "2. Index ka bill",
          "say": "IVF groups banaane mein (k-means) 1 lakh vectors par <b>22–24 s</b> lage. 4 groups par recall 100%, 16 groups par bhi 100% par 1.98–2.13 ms. Recall data par tika hai: Lab 56 ke synthetic vectors jhundon mein hain.",
          "ask": {
            "q": "Har ghante 1 lakh naye dish vectors aate hain. IVF ke saath kya dhyan rakhoge?",
            "choices": [
              "Naye data par recall naapo; groups purane pad jaayein toh dobara banao, bill yojana mein rakho",
              "Kuch nahi — IVF ek baar bana toh hamesha 94% recall dega, data kaisa bhi aaye",
              "Har naye vector par poora index dobara banao — warna naya vector kabhi nahi milega"
            ],
            "answer": 0,
            "hint": "Groups kis data se bane the, aur naya data alag ho toh?",
            "explain": "Groups purane data ke centres hain. Naye vectors bhi kisi paas ke group mein jaate hain, par data ka mizaaj badla toh recall gir sakta hai. Recall naapte raho; groups dobara banane ka bill (lab: 22–24 s per 1 lakh) yojana mein rakho.",
            "choiceExplanations": [
              "Groups purane data ke centres hain. Naye vectors bhi kisi paas ke group mein jaate hain, par data ka mizaaj badla toh recall gir sakta hai. Recall naapte raho; groups dobara banane ka bill (lab: 22–24 s per 1 lakh) yojana mein rakho.",
              "Recall data par tika hai; bikhra ya badla hua data recall gira sakta hai.",
              "Naya vector paas ke group ki list mein jud sakta hai; har baar poora rebuild zaroori nahi."
            ]
          }
        },
        {
          "title": "3. 'SQL useless'?",
          "say": "Video kehta hai vector search ke liye SQL ya NoSQL database \"useless\" hai. Asal mein <b>pgvector</b> Postgres mein exact search (default) aur IVFFlat/HNSW approximate indexes deta hai. Farq database ke naam ka nahi, <b>index</b> ka hai."
        }
      ]
    },
    {
      "type": "cards",
      "title": "🌍 NewSQL: hamesha dheema?",
      "goal": "Lab 56 ex6 — arithmetic model, kuch asli nahi chalaya. Commit kis cheez ka intezaar karta hai: copies kahan hain, aur kadam kis kram mein. RTTs maane hue: doosra zone 1 ms, Singapore 60 ms; fsync 1.3 ms.",
      "lesson": "Commit ka intezaar copies ki doori aur kadmon ke kram se tay hota hai. Ek machine sabse tez hai kyunki machine jaane par data bhi jaata hai.",
      "steps": [
        {
          "title": "1. Barabar pakkapan, barabar doori",
          "say": "Postgres ek machine: <b>1.3 ms</b> (machine gayi toh data gaya). Postgres + sync replica doosre zone mein: pehle local fsync, phir replica — <b>3.6 ms</b>. Raft, 3 zones (leader ka fsync aur follower ka safar saath-saath maana): <b>2.3 ms</b>.",
          "ask": {
            "q": "Video kehta hai CockroachDB ka write 'hamesha' single-node Postgres se dheema hoga. Model kya kehta hai?",
            "choices": [
              "Single-node tez hai kyunki copy hi nahi; zone jhelne wali copy ke saath dono ek fsync ke andar",
              "Video sahi hai — Raft har haal mein Postgres se 10 guna dheema hai, chahe copies kahin bhi hon",
              "Ulta — Raft hamesha Postgres se tez hai, kyunki Raft ko fsync ki zaroorat hi nahi"
            ],
            "answer": 0,
            "hint": "Single-node Postgres kis failure ko nahi jhelta?",
            "explain": "Single-node 1.3 ms isliye ki koi doosri copy nahi: machine ya disk gayi toh acknowledged data gaya. Zone jhelne wali copy ke saath Postgres sync 3.6 ms, Raft 2.3 ms — farq ek fsync ke andar, kadmon ke kram se. Model mein gateway hop aur multi-range transactions nahi; asli distributed SQL mein dono kharche samay jod sakte hain.",
            "choiceExplanations": [
              "Single-node 1.3 ms isliye ki koi doosri copy nahi: machine ya disk gayi toh acknowledged data gaya. Zone jhelne wali copy ke saath Postgres sync 3.6 ms, Raft 2.3 ms — farq ek fsync ke andar, kadmon ke kram se. Model mein gateway hop aur multi-range transactions nahi; asli distributed SQL mein dono kharche samay jod sakte hain.",
              "Same placement par model mein farq ~1.3 ms hai, 10 guna nahi.",
              "Raft ka har replica apna log fsync karta hai; majority ka fsync commit se pehle chahiye."
            ]
          }
        },
        {
          "title": "2. Doori ka asli bill",
          "say": "Postgres + sync replica Singapore mein: <b>62.6 ms</b>. Raft, 3 regions (Mumbai, Singapore, Frankfurt): <b>61.3 ms</b> — sabse paas ka follower Singapore. Postgres sync standby down ho jaaye toh commits ruk sakte hain jab tak setting na badle.",
          "ask": {
            "q": "Mumbai ke payments 'Mumbai region down' bhi jhelne chahiye. Commit ka samay kis cheez se aayega?",
            "choices": [
              "Doosre region ki copy ke round trip se — ~60 ms, product koi bhi ho",
              "Database ke brand se — sahi NewSQL chuno toh region ki copy bhi 2 ms mein",
              "fsync se — tez SSD lo toh region wali copy ka samay bhi ghat jaayega"
            ],
            "answer": 0,
            "hint": "Mumbai se Singapore ka round trip kitna maana?",
            "explain": "Region jhelna = doosre region mein durable copy, aur commit us copy ka intezaar karta hai. Model: 61–63 ms, chahe Postgres sync ho ya Raft. Doori sabse bada bill hai; product ka naam doori se kam farq daalta hai.",
            "choiceExplanations": [
              "Region jhelna = doosre region mein durable copy, aur commit us copy ka intezaar karta hai. Model: 61–63 ms, chahe Postgres sync ho ya Raft. Doori sabse bada bill hai; product ka naam doori se kam farq daalta hai.",
              "Roshni ki raftaar brand se nahi badalti; Model mein Mumbai–Singapore RTT 60 ms maana hai.",
              "fsync 1.3 ms hai; 60 ms ke saamne SSD ka farq chhota."
            ]
          }
        },
        {
          "title": "3. Naam",
          "say": "SQL + horizontal scaling + consensus: <b>NewSQL / distributed SQL</b> (CockroachDB Raft, Spanner Paxos). Commit se pehle replica ka intezaar: <b>synchronous replication</b>; baad mein: <b>asynchronous</b>. Har kaam ke liye alag database: <b>polyglot persistence</b>. Ek engine mein kai shapes: <b>multi-model</b>."
        }
      ]
    },
    {
      "type": "docker",
      "title": "🧪 Vectors (asli) aur commit ka intezaar (model)",
      "project": "56-storage-taxonomy",
      "exercise": "ex5-vector",
      "goal": "Exact vs IVF, 10,000 aur 1 lakh vectors par (ex5). Phir commit latency ka arithmetic model (ex6).",
      "why": "Node 24+ chahiye. ex5 asli hai, ~1 minute (IVF groups banaana sabse lamba); samay machine ke saath badlega, recall same. ex6 model hai, har run same.",
      "steps": [
        {
          "text": "Lab folder se: vectors.",
          "cmd": "cd docker-labs/56-storage-taxonomy && npm start -- ex5-vector",
          "expect": "REAL RUN: Node v24.18.0; 128-number unit vectors in 200 clumps (noise per number 0.06); 100 held-out queries; top 10 by dot product\n\n== 10,000 vectors ==\nexact, JS scan of all 10,000       1.78 ms per query   recall 100%\nexact, same scan in SQLite (in memory)   18.03 ms per query   recall 100% (same answers)\nIVF, look in  1 of 256 groups       0.08 ms per query   recall 93%   (256 centres + ~52 candidates = ~308 dot products)\nIVF, look in  4 of 256 groups       0.10 ms per query   recall 100%   (256 centres + ~158 candidates = ~414 dot products)\nIVF, look in 16 of 256 groups       0.20 ms per query   recall 100%   (256 centres + ~637 candidates = ~893 dot products)\n(building the IVF groups took 2.6 s)\n\n== 1,00,000 vectors ==\nexact, JS scan of all 1,00,000    18.17 ms per query   recall 100%\nexact, same scan in SQLite (in memory)  212.49 ms per query   recall 100% (same answers)\nIVF, look in  1 of 256 groups       0.22 ms per query   recall 94%   (256 centres + ~484 candidates = ~740 dot products)\nIVF, look in  4 of 256 groups       0.58 ms per query   recall 100%   (256 centres + ~1,574 candidates = ~1,830 dot products)\nIVF, look in 16 of 256 groups       1.98 ms per query   recall 100%   (256 centres + ~6,170 candidates = ~6,426 dot products)\n(building the IVF groups took 22.2 s)\n\nBoth exact baselines here compare the query with every vector (no filter). IVF compares far fewer candidates and\nreturns approximate results. HNSW (in many vector stores and in pgvector) is another approximate index; not built here."
        },
        {
          "text": "Commit ka intezaar.",
          "cmd": "npm start -- ex6-newsql",
          "expect": "MODEL: commit latency = what the commit waits for (assumed RTTs; assumed fsync 1.3 ms, the fast run in lab 55)\n\nsetup                                              waits for                                     commit    survives\nPostgres, one machine                              local fsync                                    1.3 ms    process crash, power cut\nPostgres + async replica (other zone)              local fsync (replica later)                    1.3 ms    machine dies (replica takes over)\nPostgres + sync replica (other zone)               fsync, then RTT + standby fsync                3.6 ms    a whole zone goes down\nRaft, 3 replicas in 3 zones                        max(fsync, RTT + follower fsync)               2.3 ms    a whole zone goes down\nPostgres + sync replica (Singapore)                fsync, then RTT + standby fsync               62.6 ms    the Mumbai region goes down\nRaft, 3 regions (Mumbai, Singapore, Frankfurt)     max(fsync, RTT to nearer follower + fsync)    61.3 ms    a whole region goes down\n\nwhat can still be lost:\n  Postgres, one machine                              disk or machine dies: acknowledged data gone until a backup is restored\n  Postgres + async replica (other zone)              the last few commits may not have reached the replica\n  Postgres + sync replica (other zone)               failover is a separate step; if the standby is down, commits wait\n  Raft, 3 replicas in 3 zones                        nothing acknowledged; the majority keeps serving\n  Postgres + sync replica (Singapore)                failover is a separate step; if the standby is down, commits wait\n  Raft, 3 regions (Mumbai, Singapore, Frankfurt)     nothing acknowledged; majority keeps serving\n\nThe wait is set by the distance to the copies a commit must wait for, and by the order of the steps (serial vs\nparallel). Product names do not set it: the same placement gives waits within one fsync of each other here.\nNot modeled: the hop from the SQL gateway to the range leader, transactions that touch several ranges (extra\ncoordination round trips), and clock-uncertainty waits (Spanner commit wait, which can partly overlap replication).\nThose can add time in distributed SQL, so a real multi-range write there is often slower than this table.\nMeasure your own transactions."
        }
      ],
      "observe": {
        "q": "ex5 mein SQLite ka exact scan JS ke exact scan se ~10× dheema tha, jawab same. Numbers se kya seekhoge?",
        "choices": [
          "Dono exact scan sab vectors chhoote hain; SQLite mein har row par function call ka kharcha",
          "SQLite vector search ke liye galat jawab deta hai, isliye vector database chahiye",
          "JS hamesha database se 10 guna tez hota hai, toh data JS mein hi rakho"
        ],
        "answer": 0,
        "hint": "Dono ke top-10 jawab same the ya alag?",
        "explain": "Jawab same — dono 1 lakh vectors se milaate hain. SQLite mein har row par JS function call aur bytes ki copy (alag se profile nahi kiya). Bada farq approximate index se aata hai (0.21–0.23 ms), na ki 'SQL vs vector DB' ke naam se.",
        "choiceExplanations": [
          "Jawab same — dono 1 lakh vectors se milaate hain. SQLite mein har row par JS function call aur bytes ki copy (alag se profile nahi kiya). Bada farq approximate index se aata hai (0.21–0.23 ms), na ki 'SQL vs vector DB' ke naam se.",
          "Tool 100 queries ke JS exact jawab banata hai; pehli 10 par SQLite se tulna, checked jawab same.",
          "Lab sirf ek scan ka tareeka naapta hai; JS mein data rakhne ke durability aur query ke sawaal alag."
        ]
      },
      "lesson": "Vector: farq approximate index ka, recall ki keemat ke saath. NewSQL: commit ka samay copies ki doori aur kadmon ke kram se."
    },
    {
      "type": "bins",
      "title": "🗂️ Kaunsa sawaal, kaunsa shape?",
      "instructions": "Video ka tareeka: pehle app ke sawaal likho, phir shape chuno. Database product nahi — data rakhne aur query karne ka primary tareeka classify karo. Ek engine kai tareeke support kar sakta hai (Postgres JSON aur key lookup bhi karta hai).",
      "bins": [
        {
          "id": "rel",
          "label": "🧮 Relational (SQL)"
        },
        {
          "id": "kv",
          "label": "🔑 Key-value"
        },
        {
          "id": "doc",
          "label": "📄 Document"
        },
        {
          "id": "graph",
          "label": "🕸️ Graph"
        },
        {
          "id": "vec",
          "label": "🧭 Vector"
        }
      ],
      "items": [
        {
          "text": "Refund: wallet aur order alag tables mein, dono updates ek SQL transaction mein",
          "bin": "rel",
          "explain": "Kai tables ek transaction mein, sab ya kuch nahi — relational ka seedha kaam. Transaction akela sahi balance guarantee nahi karta; refund amount aur duplicate-request ke niyam bhi chahiye."
        },
        {
          "text": "Pichhle mahine category-wise sales ka total",
          "bin": "rel",
          "explain": "Kisi bhi column par group aur join — SQL ka lachila sawaal (lab ex1 Q2: index wala join 11.2–12.2 ms)."
        },
        {
          "text": "Login session: sirf token se ek opaque session value lao, koi aur sawaal nahi",
          "bin": "kv",
          "explain": "Ek key, ek value, koi aur sawaal nahi — key-value ka sabse sasta raasta."
        },
        {
          "text": "Product page: ek nested JSON document, page par poora document ek saath padho, kam rishte",
          "bin": "doc",
          "explain": "Ek page ka saara data ek jagah: document (lab ex1 Q1: 2.7–3.3 µs). Rishte kam hain, toh copies ka jhanjhat kam."
        },
        {
          "text": "Kya ek account 5 hops ke andar kisi blocked account se juda hai?",
          "bin": "graph",
          "explain": "Gehra traversal: har hop par log tezi se badhte hain (lab ex3). Graph model ka asli kaam."
        },
        {
          "text": "Is dish ki photo jaisi dikhne wali 10 dishes",
          "bin": "vec",
          "explain": "Matlab ki samaanta: embeddings aur approximate index. Lab ex5 ke synthetic vectors par IVF 0.21–0.23 ms aur recall 94% (exact top-10 ke muqaable)."
        }
      ],
      "lesson": "Sawaal pehle, shape baad mein. Zyadatar shuruaat relational se: JSON, index aur join sab ek jagah. Doosra shape tab jodo jab naapa hua sawaal dard de — aur har naya database copies sync rakhne ka kaam bhi laata hai."
    }
  ],
  "interview": {
    "title": "Interview Round — taxonomy chuno",
    "instructions": "Pehle socho: sawaal kya hai, kitna sahi chahiye, aur kaunsa failure jhelna hai? Phir jawab chuno. 🎤",
    "questions": [
      {
        "q": "Startup ka app Postgres par hai. Ab 'milte-julte products' feature chahiye: 5 lakh products ke embeddings. Team naya vector database lana chahti hai. Pehle kya sochoge?",
        "choices": [
          "Pehle pgvector try karo — Postgres mein HNSW/IVFFlat index aur recall naapo; zaroorat dikhe tab naya DB",
          "Turant alag vector database — Postgres vectors ke liye bana hi nahi, Postgres mein search mumkin nahi",
          "Exact search hi chalao — 5 lakh vectors chhote hain, har query sab se milao, index ki zaroorat nahi",
          "Embeddings JSON mein Postgres ki table mein rakho aur LIKE se milte-julte dhoondho"
        ],
        "answer": 0,
        "explain": "Lab ex5: tezi approximate index se aayi (IVF 0.21–0.23 ms vs exact 17.6–36.4 ms per 1 lakh). pgvector Postgres mein approximate vector indexes deta hai, aur ek database kam = copies sync karne ka kaam kam. Recall aur latency naapo; Postgres kam pade tab alag vector DB.",
        "choiceExplanations": [
          "Lab ex5: tezi approximate index se aayi (IVF 0.21–0.23 ms vs exact 17.6–36.4 ms per 1 lakh). pgvector Postgres mein approximate vector indexes deta hai, aur ek database kam = copies sync karne ka kaam kam. Recall aur latency naapo; Postgres kam pade tab alag vector DB.",
          "pgvector Postgres mein exact aur approximate dono search deta hai.",
          "Fixed 128 dimensions aur full scan par 5 lakh vectors = 5 guna comparisons; latency lab ne nahi naapi. Query rate aur latency budget par exact aur approximate dono naapo.",
          "LIKE text milaata hai; vectors ki samaanta dot product ya distance se naapi jaati hai."
        ]
      },
      {
        "q": "Payments ko Mumbai region gayab hone par bhi har acknowledged write bachana hai. Model mein synchronous copy Singapore mein, RTT 60 ms maana. Team kehti hai: 'NewSQL lo, commit 2 ms rahega.' Kya kahoge?",
        "choices": [
          "Model mein nahi: Singapore ki durable copy ka intezaar chahiye — Postgres sync 62.6, Raft 61.3 ms",
          "Sahi — NewSQL consensus se commit hamesha single-node jitna tez rakhta hai, copy kahin bhi ho",
          "Sahi — bas async replica rakho, commit 1.3 ms aur region gaya toh bhi kuch nahi khoyega",
          "Region ki zaroorat nahi — Mumbai ke 3 zones mein 3 replicas region ka jaana bhi jhel lete hain"
        ],
        "answer": 0,
        "explain": "Lab ex6 (model): har acknowledged write bachane ke liye commit ko doosre region ki durable copy ka intezaar karna padta hai. Maane hue 60 ms RTT par Postgres sync 62.6 ms, Raft 61.3 ms. 2 ms sirf ek region ke zones wali copies par aata hai, jo region ka jaana nahi jhelti. Doosri placement aur RTT par naya hisaab karo.",
        "choiceExplanations": [
          "Lab ex6 (model): har acknowledged write bachane ke liye commit ko doosre region ki durable copy ka intezaar karna padta hai. Maane hue 60 ms RTT par Postgres sync 62.6 ms, Raft 61.3 ms. 2 ms sirf ek region ke zones wali copies par aata hai, jo region ka jaana nahi jhelti. Doosri placement aur RTT par naya hisaab karo.",
          "Consensus majority ka intezaar karta hai; majority doosre region mein ho toh round trip lagta hai.",
          "Async replica par region gira toh aakhri commits replica tak pahunche hi nahi honge.",
          "Teeno zones ek hi region mein hain; region gaya toh teeno gaye."
        ]
      }
    ]
  },
  "success": [
    "Vector search mein exact vs approximate ka sauda samjha sakte ho",
    "Commit latency ko copies ki doori se jod sakte ho",
    "Sawaal se shape chun sakte ho"
  ],
  "cards": [
    {
      "front": "Lab 56 ex5: exact vs IVF (1 lakh vectors)?",
      "back": "Exact JS 17.6–36.4 ms, SQLite 212–281 ms. IVF 1 group 0.21–0.23 ms, recall 94%, ~740 dot products (~135× kam). 4 groups: 100%."
    },
    {
      "front": "Lab 56 ex6 (model): commit ka intezaar?",
      "back": "Ek machine 1.3 ms. Zone copy: Postgres sync 3.6 ms (serial), Raft 2.3 ms (parallel maana). Region copy: 61–63 ms. Doori sabse bada bill."
    },
    {
      "front": "Shape kaise chunna?",
      "back": "Pehle app ke 5 sawaal likho. Id se → key-value; ek saath padha jaane wala page → document; join/group/transaction → relational; gehre rishte → graph; samaanta → vector. Shuruaat aksar relational se."
    }
  ]
}
]);
})();
