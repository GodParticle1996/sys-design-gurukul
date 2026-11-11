# 🧪 Lab 56 — Storage Taxonomy: relational, document, key-value, graph, vector, NewSQL

System Gurukul → 🧪 First Principles → Taxonomy of Storage (Kyun · Kaise · Code · Kab).
Node 24+ (SQLite Node ke andar hai: `node:sqlite`), koi package install nahi. `ex1`–`ex5` asli runs hain (asli SQLite file,
asli queries, asli query plans); `ex0` aur `ex6` model hain (har run same). Captures Node v24.18.0 + SQLite 3.53.1 par,
WSL2 machine par. ex1–ex3 aur ex4 ka hissa B apni SQLite file OS ke temp folder mein banate hain aur run ke baad mita dete
hain; ex4 ka hissa A aur ex5 SQLite ko memory mein chalate hain. Koi port nahi.

```bash
npm start -- ex0-slowmo    # MODEL: Asha ghar badalti hai — address ek row mein vs 6 documents mein copy, beech mein crash
npm start -- ex1-shapes    # ASLI: wahi 1 lakh users teen tarah (tables / JSON docs / key-value); 3 sawaal, plans ke saath
npm start -- ex2-join      # ASLI: 10,000 → 10 lakh users; index ke saath aur bina join ka samay
npm start -- ex3-graph     # ASLI: friend-of-friend — SQL + index, SQL bina index, adjacency walk; 1–4 hops
npm start -- ex4-schema    # ASLI: STRICT table ke rules vs teen app versions ke JSON docs; partial readers, migration
npm start -- ex5-vector    # ASLI: 128-number embeddings — exact scan (JS, SQLite) vs IVF index; recall aur samay
npm start -- ex6-newsql    # MODEL: commit kis cheez ka intezaar karta hai — copies kahan hain, product ka naam nahi
npm test                   # 8 tests
docker compose --profile ex1-shapes up --build   # supplied, untested
```

**Is machine par Docker nahi; compose chalaya nahi gaya.** Samay (µs, ms) machine ke saath badlenge; ginti (rows, recall,
answers) seeded data par har run same.

## Lab ka daayra

- **Data** (`lib/build.js`): KhanaKart ke users, addresses, orders (har user 5), friends (har user 20 random) aur har user
  ka ek JSON document (`user_docs`: profile + address + aakhri 5 orders). Seeded random (`lib/rng.js`), STRICT tables.
- **Teen shapes, ek engine:** relational, document aur key-value — teeno SQLite (ya JS `Map`) mein. Isliye farq **data ke
  shape aur query** ka hai, alag products ke engine, network ya cache ka nahi. Asli MongoDB, Redis ya Neo4j ke numbers alag
  honge; lab sirf shape ka asar alag karke dikhata hai.
- **Graph:** SQL self-join (index ke saath aur bina) vs JS adjacency list (har user ke dost seedhe array mein — graph
  database ka "index-free adjacency" jaisa idea). Neo4j nahi chalaya.
- **Vector:** 128-number unit vectors, 200 jhund (clumps), 100 held-out queries; exact top-10 vs IVF (k-means ke 256
  groups, sirf paas ke groups mein dhoondho). HNSW nahi banaya.
- **NewSQL:** sirf arithmetic model; koi distributed database nahi chalaya.

## ex0-slowmo — ek row vs chhe copies (model)

Asha (user 42) Pune 411004 se 411038 jaati hai.

- **Relational:** address ek row; orders id se jude hain. Ek `UPDATE`, aur har join naya address dekhta hai.
- **Documents:** address profile doc aur 5 pending order docs mein copy hai. Lab ka business niyam: Asha ne pending deliveries
  ka destination bhi badalne ko kaha. (Order ke waqt chuna address aur issued invoice ka address itihaas hain; niyam ke
  bina nahi badalte.) App 3 docs badal ke crash: **3 naya, 3 purana**,
  aur database ke paas koi nishaan nahi ki sach kaunsa hai. Ilaaj: saare writes ek transaction mein, ya address ek jagah.

ex1 3 writes ke baad wala crash asli SQLite par chalata hai (transaction ke saath aur bina).

## ex1-shapes — wahi data, teen shapes (asli)

1,00,000 users, har user 5 orders, ek SQLite file. Teen runs:

**Q1 — "user 4242 aur address aur aakhri 5 orders"**, ek object ki shakal mein (2,000 runs ka median; teeno ek hi
object lautate hain — naye order pehle — aur tool poora object milaata hai)

| shape | samay | plan |
|---|---:|---|
| relational: 3 tables ka join + rows ko object mein jodna | 10.1–11.7 µs | teen `SEARCH` (primary key, primary key, `orders_user` index) + chhota sort |
| document: ek JSON row + parse | 2.7–3.3 µs | ek `SEARCH` primary key par |
| key-value: JS `Map` get + parse | 1.1–1.4 µs | database call hi nahi |

**Q2 — "Pune ke kitne users ne biryani order ki?"** (sach: 6,171; teeno ka jawab same)

| shape | samay | plan |
|---|---:|---|
| relational: index wala join | **11.2–12.2 ms** | `users_city` covering index + `orders_user` index |
| document: JSON ke andar SQL | 98–106 ms | `SCAN user_docs` + har doc ke orders |
| key-value: har value padho | 136–156 ms | KV sirf key se laata hai; baaki sab = sab padho |

**Q3 — "user 4242 ghar badalta hai"**

- Relational: **1 row** badli; har join naya address dekhta hai.
- Documents: address **6 documents** mein copy (user doc + 5 pending invoice docs). App 3 ke baad crash, transaction nahi:
  **3 naya (411004), 3 purana** — kaunsa sach? Wahi crash ek transaction ke andar: ROLLBACK, 0 badle, sab purana aur
  ek-jaisa; move dobara karna hai. Bina crash: 6 ke 6.

Seekh: jis sawaal ke liye shape bana, us par shape tez (Q1: doc/KV). Lab mein Q2 ke liye document aur JS Map ke paas index
nahi, toh scan (Q2: doc/KV
8–13× dheeme). Copies banaana Q1 tez karta hai, par Q3 mein har copy badalne ka zimma app par aata hai.

## ex2-join — kya join table ke saath dheema hota hai? (asli)

Q1 (user + address + aakhri 5 orders), har size ki nayi SQLite file. Teen runs:

| users | orders | index `orders(user_id)` ke saath | bina index | plan bina index |
|---:|---:|---:|---:|---|
| 10,000 | 50,000 | 7.7–9.4 µs | 1.2–1.4 ms | `SCAN o` |
| 1,00,000 | 5,00,000 | 9.8–14.1 µs | 13.1–19.8 ms | `SCAN o` |
| 10,00,000 | 50,00,000 | **10.8–14.2 µs** | **139.9–161.4 ms** | `SCAN o` |

- Index ke saath join kuch B-tree pages chalta hai: users 100 guna badhe, samay ~1.5 guna. Join ka kharcha **chhue gaye
  rows aur index** par tika hai, table ke size par seedha nahi.
- Bina index har query har order padhti hai: samay table ke saath seedha badhta hai. Is chhote-result, garam-cache sawaal
  mein missing index sabse bada kharcha tha; doosre joins mein matching rows, sort aur disk reads bhi samay badhate hain.
- Lab ki file OS ke page cache mein garam hai. Thanda cache ho toh har B-tree page ek disk read ban sakta hai (lab 55 ex4).

## ex3-graph — friend of friend (asli)

Har user ke 20 random dost (directed; self-loop aur dohre edge ho sakte hain). Sawaal: **2 kadam ki walks ke alag
endpoints** — wahi jo SQL self-join ginta hai; test isko recursive SQL se depth 1–4 tak milaata hai. SQL + index aur walk:
200 users ka median; bina index: ek query. Teen runs:

| users | friend rows | jawab | SQL + index | SQL, bina index (1 query) | adjacency walk (JS) |
|---:|---:|---:|---:|---:|---:|
| 10,000 | 2,00,000 | 393 | 90–111 µs | 46–52 ms | 4.6–5.8 µs |
| 1,00,000 | 20,00,000 | 400 | 111–154 µs | 475–567 ms | 9.5–16.3 µs |
| 10,00,000 | 2,00,00,000 | 400 | **162–168 µs** | **5.0–5.2 s** | **18.6–19.6 µs** |

Gehraai (1 lakh users, adjacency walk): 2 hops 400 endpoints 2.9–3.9 µs · 3 hops 7,670 · 56–61 µs · 4 hops 78,434 · 3.0–4.2 ms.

- Bina index SQL seconds leta hai (5.0–5.2 s). **Index ke saath** 2-hop SQL 10 lakh users par bhi 0.3 ms se kam — zyadatar
  apps ke liye kaafi. Adjacency walk usse **~8–9× tez** hai (19–20 µs): dost seedhe array mein, koi index lookup nahi.
- Walk ka samay users 100 guna badhne par ~3–4 guna badha (4.6 → 19.6 µs). Is JS implementation mein allocation, GC aur
  memory cache ka asar alag se nahi naapa.
- Walk ka kaam har layer ke khole gaye nodes, dekhe gaye edges aur dedupe par tika hai; final endpoints (400 → 7,670 →
  78,434) akela kaam nahi batate — 3 se 4 hops par endpoints ~10×, samay ~50–75×. Gehre sawaal (3+ hops, raaste) graph
  model ki asli wajah hain; lab ne gehre sawaal sirf walk par naape, SQL ke saath tulna nahi ki.

## ex4-schema — schema on write vs schema on read (asli)

**A.** STRICT table, `NOT NULL` aur `CHECK` (6 ank ka pincode): achhi row save; chhota pincode (`4110`), gayab pincode aur `41100X` (6 akshar, par aakhri ank nahi) — teeno refuse, database khud error
deta hai. (JS ka number bhejna alag maamla hai: STRICT table number ko text mein badal deti hai, toh rule ko format
jaanchna chahiye; app ki boundary par type bhi jaancho.)

**B.** 1,00,000 customer documents teen app versions se: v1 `{zip}` 49,935 · v2 `{postal_code}` 30,003 · v3
`{address:{pin}}` 20,062. Database ne teeno maan liye. Sawaal: Pune (411xxx) mein kitne customers? Sach: **14,928**.

| reader jaanta hai | mila | |
|---|---:|---|
| sirf v3 | 2,974 | **20%**, koi error nahi |
| v2 + v3 | 7,418 | **50%**, koi error nahi |
| v1 + v2 + v3 | 14,928 | 100% |

Migration: 79,938 documents v3 mein dobara likhe (132–156 ms; tool check karta hai ki baad mein ginti sach ke barabar), phir sirf-v3 reader ko bhi 14,928. Schema dono taraf hai:
table mein, ya har reader aur har migration mein. Galat reader **chupchaap kam** ginta hai — error nahi deta.

## ex5-vector — "is dish jaisi 10 dishes" (asli)

128 numbers ke unit vectors, 200 jhund (noise 0.06 per number), 100 held-out queries, top 10 dot product se. Teen runs:

| 1,00,000 vectors | samay per query | recall | dot products per query |
|---|---:|---:|---:|
| exact, JS mein sab | 17.6–36.4 ms | 100% | 1,00,000 |
| exact, wahi scan SQLite (memory) mein, user-defined function se | 212–281 ms | 100% | 1,00,000 |
| IVF, 256 mein se 1 group | **0.21–0.23 ms** | **94%** | 256 centres + ~484 = ~740 |
| IVF, 4 groups | 0.54–0.60 ms | 100% | ~1,830 |
| IVF, 16 groups | 1.98–2.13 ms | 100% | ~6,426 |

10,000 vectors par: exact JS 1.8–2.0 ms, SQLite 18–21 ms; IVF 1 group 0.08–0.12 ms, recall 93%. IVF groups banaane mein
1 lakh par 22–24 s lage (k-means; aakhir mein har vector apne sabse paas ke final centre ki list mein) — index ka bill pehle
bharna padta hai.

- Lab ke dono exact baselines (bina filter) har vector se milaate hain. SQLite ka scan JS se ~10× dheema: har row par
  function call aur bytes ka copy (alag se profile nahi kiya). Farq "vector database" ke naam ka nahi, **approximate
  index** ka hai: thoda recall chhod ke ~135× kam dot products (1 lakh vectors vs ~740). (Exact search hamesha full scan ho, aisa niyam nahi:
  filter index ya chhote dimensions par exact index bhi ho sakta hai.)
- Recall data par tika hai: yahan vectors jhundon mein hain. Bikhra data ho toh 1 group ka recall bahut gir sakta hai.
- HNSW (pgvector aur kai vector stores mein) alag approximate index hai; lab ne nahi banaya.

## ex6-newsql — commit kis cheez ka intezaar karta hai (model)

Arithmetic model (`lib/latency.js`: serial = jodo, parallel = sabse dheema). RTTs **maane hue** hain (doosra zone 1.0 ms,
Mumbai–Singapore 60 ms, Mumbai–Frankfurt 120 ms); fsync 1.3 ms maana (lab 55 ka tez run; lab 55 mein 1.2–4.8 ms aaya).

- **PostgreSQL sync replica** (`synchronous_commit = on`, ek synchronous standby): docs ke mutaabik commit record pehle
  primary ki disk par likha jaata hai, **phir** standby ko jaata hai; standby flush karke jawab deta hai. Kram serial.
- **Raft:** leader ka apna log write aur followers ko bhejna **saath-saath** maana (Raft isko allow karta hai; har
  implementation aisa kare, zaroori nahi). Commit ko majority chahiye: leader + sabse paas ka follower.

| setup | intezaar | commit | kya jhel leta hai |
|---|---|---:|---|
| Postgres, ek machine | local fsync | 1.3 ms | process crash, power cut |
| Postgres + async replica (doosra zone) | local fsync (replica baad mein) | 1.3 ms | machine (aakhri kuch commits kho sakte hain) |
| Postgres + sync replica (doosra zone) | fsync, phir RTT + standby fsync | 3.6 ms | poora zone |
| Raft, 3 zones mein 3 replicas | max(fsync, RTT + follower fsync) | 2.3 ms | poora zone |
| Postgres + sync replica (Singapore) | fsync, phir RTT + standby fsync | 62.6 ms | Mumbai region |
| Raft, 3 regions | max(fsync, paas ke follower tak RTT + fsync) | 61.3 ms | poora region |

- **Intezaar copies ki doori aur kadmon ke kram se tay hota hai**, product ke naam se nahi. Same placement par is model mein
  dono ka farq ek fsync (~1.3 ms) ke andar hai; doori (1 ms vs 60 ms) kahin bada farq daalti hai.
- Postgres sync standby down ho jaaye toh commits ruk sakte hain jab tak replication ki setting na badle; failover alag
  kadam hai.
- **Model mein nahi:** SQL gateway se range leader tak ka hop, kai ranges chhoone wale transactions ka coordination, aur
  clock uncertainty ka intezaar (Spanner ka commit wait, jo replication ke saath kuch overlap kar sakta hai). Yeh
  distributed SQL mein samay jod sakte hain, isliye asli multi-range write aksar is table se dheema hota hai. Apne
  transactions naapo.

## Source ke daave aur sudhaar

Video: First Principles #6, "The Taxonomy of Storage". Video ka mool sabak — **database ka naam nahi, access pattern
dekho** — lab ke har run se mel khaata hai. Kuch daave zyada bade hain:

| Video ka daava | Lab / source kya kehta hai |
|---|---|
| Joins millions/billions rows par "incredibly expensive", random I/O | ex2: index ke saath join 10,000 → 10 lakh users par 7.7–14.2 µs (lagbhag same). Kharcha bina index ka hai (1.2 → 161 ms), ya thande cache ka. |
| Friend-of-friend par "SQL will scream in pain", seconds ya minutes | ex3: seconds sirf bina index (5.0–5.2 s). Index ke saath 2-hop 10 lakh users par 162–168 µs. Adjacency walk ~8–9× tez (19–20 µs) — graph shape ka faayda asli hai, par index wala SQL bhi sub-millisecond. |
| Graph query ki raftaar "sirf aapke doston" par, users ki ginti par nahi | ex3: kaam khole gaye nodes aur edges ke saath badhta hai, total users ke saath seedha nahi (sahi disha). Users 100 guna par walk ~3–4 guna dheema (4.6 → 19.6 µs) — lagbhag, poori tarah nahi. |
| Key-value O(1), "values search nahi kar sakte" | Sahi disha. ex1 Q2: KV ko har value padhni padi (136–156 ms). DynamoDB Query partition key maangta hai, sort key par range de sakta hai; Scan har item padhta hai; secondary indexes alag. |
| Document store: ek disk trip, "no joins, no random I/O" (aur baaki sawaal mushkil) | ex1 Q1 (same object): doc 2.7–3.3 µs vs join + jodna 10.1–11.7 µs — dono garam cache mein microseconds. MongoDB mein `$lookup` left outer join hai, field indexes aur optional schema validation bhi; lab ke Q2 mein JSON field par index nahi banaya. |
| ACID ke saath "database won't lose it or corrupt it" | Durability fsync aur config par tiki hai, corruption ke liye checksums aur doosri copy chahiye (lab 55). |
| NewSQL (CockroachDB, Spanner) Raft jaisa consensus use karte hain | CockroachDB Raft use karta hai. **Spanner Paxos** use karta hai (OSDI 2012 paper). |
| CockroachDB ka write "hamesha" single-node Postgres se dheema | ex6 (model): single-node Postgres (1.3 ms) tez hai kyunki machine jaane par data jaata hai. Zone jhelne wali copy ke saath Postgres sync replica 3.6 ms, Raft 2.3 ms — same placement par farq ek fsync ke andar. Multi-range transactions aur gateway hop distributed SQL mein extra samay jod sakte hain. |
| Vector search ke liye "SQL or NoSQL database is useless" | pgvector Postgres mein exact search (default) aur IVFFlat/HNSW approximate indexes deta hai. ex5: lab ke exact baselines har vector se milaate hain; tezi approximate index se aayi. |
| 2005 ke aas-paas Amazon ka shopping cart | Dynamo paper (SOSP 2007): cart service ko "always writeable" store chahiye tha, failures ke beech bhi. |

Sources (saare primary, padhe gaye 2026-11-11):
- E. F. Codd, "A Relational Model of Data for Large Shared Data Banks", Communications of the ACM, 1970.
- DeCandia et al., "Dynamo: Amazon's Highly Available Key-value Store", SOSP 2007 — https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf
- Corbett et al., "Spanner: Google's Globally-Distributed Database", OSDI 2012 — https://research.google/pubs/spanner-googles-globally-distributed-database-2/
- CockroachDB replication layer (Raft) — https://www.cockroachlabs.com/docs/stable/architecture/replication-layer
- pgvector README — https://github.com/pgvector/pgvector
- MongoDB `$lookup` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/ · schema validation — https://www.mongodb.com/docs/manual/core/schema-validation/
- DynamoDB Query — https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.html · Scan — https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Scan.html

## Files

```
lib/build.js   seeded KhanaKart data, temp SQLite, plan()     lib/graph.js   FoF SQL, adjacency, walk
lib/vector.js  vectors, dot, top-k, k-means (IVF)              lib/move.js    address copies, crash, transaction
lib/rng.js     seeded random                                   lib/stats.js   median / percentile
lib/schema.js  ex4 ka DDL, readers aur migration SQL           lib/latency.js serial / parallel arithmetic (ex6)
tools/*.js     ex0 … ex6                                       test/core.test.js  8 tests
captures/      har tool ke teen runs + test run
```

## Practice

1. `ex2` mein index hata ke 10 lakh users par query plan dekho. `SCAN o` kitni rows padhta hai?
2. `tools/graph.js` mein dost 20 se 50 karo. 2-hop jawab aur samay kaise badle? 3 hops?
3. `ex4` mein ek v4 shape `{location:{pincode}}` jodo. Purane readers kitna galat ginte hain, aur error aata hai?
4. `ex5` mein groups 256 se 64 karo. Probe 1 ka recall aur samay?
5. `ex6` mein Singapore ki jagah Hyderabad (RTT ~25 ms maan ke) rakho. Commit kitna hua, aur kya jhelta hai?
