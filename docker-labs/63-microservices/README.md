# 🧪 Lab 63 — Microservices: network ka tax, tail latency, do databases, copies aur Conway

System Gurukul → 🧪 First Principles → Microservices: kab NAHI (Kyun · Kaise · Code · Kab).
Node 24+, koi package install nahi. Captures Node v24.18.0 par, WSL2 machine par. ex0 apne hi process mein `127.0.0.1` ke ek
random port par HTTP server chalata hai (bahar kuch publish nahi); baaki exercises seedha hisaab ya model hain.

Lab 16 (Prime Video) asli "boundary tax" (S3 + Step Functions jaisa orchestrator) aur monolith ki copies se scaling dikhata hai;
`saga` aur `dbperservice` levels pattern sikhate hain. Lab 63 un baaton ko naapta hai jo video bolta hai par dikhata nahi: function call vs
network call is laptop par, fan-out mein tail latency, ek transaction vs saga vs 2PC har crash point par, copies ka DB connection
par asar, aur Conway / Brooks ka hisaab.

```bash
npm start -- ex0-call-cost       # ASLI: function call vs JSON vs loopback HTTP (keep-alive / naya connection), 3 runs
npm start -- ex1-fanout          # MODEL (seeded): 1 / 3 / 10 / 30 services — sequential vs parallel, p50 / p99
npm start -- ex2-two-databases   # ASLI ginti: ek DB vs saga (memory / durable log) vs 2PC — crash, recovery crash, readers
npm start -- ex3-copies          # Arithmetic: monolith ki copies — idle RAM aur DB connections
npm start -- ex4-conway          # Arithmetic: Brooks ke baat-cheet ke raaste; field rename mein kitne deploys
npm test                         # 4 tests
docker compose --profile ex0-call-cost up --build   # supplied, untested
```

**Is machine par Docker nahi; compose chalaya nahi gaya.**

## Lab ka daayra (kya asli, kya model)

- **ex0 asli:** Node ke andar function call, JSON (request + jawab banana aur padhna), aur isi machine par HTTP (loopback) — kisi
  doosri machine ka network nahi. Function/JSON rows 5 batches ke ausat mein sabse achha; HTTP rows asli calls ka median.
  "Doosri machine" wali row mein 0.5 ms ka round trip **maana** gaya hai.
- **ex1 model:** har call 1–3 ms, 1% calls theek 50 ms; jhatke alag-alag (ek "saanjha jhatka" case bhi); har jawab zaroori; seeded.
- **ex2 asli ginti:** chhota state machine; har step ke baad crash, recovery (recovery bhi ek baar crash ho sakti hai), aur har step
  ke baad ek reader. Participants operation id ki receipt rakhte hain. Koi asli database nahi.
- **ex3, ex4:** seedha hisaab. Postgres ka `max_connections` aam taur par 100 (kuch slots reserved).

## ex0-call-cost — function call vs network call

```
$ npm start -- ex0-call-cost
ASLI: ek hi sawaal ("sku-42 kitne bache?") chaar tarah se, is machine par. Order ka JSON 392 bytes.

tareeka                                                   ek call*            p99        function call se
function call (monolith ke andar module)                        5 ns             —      1×
JSON: request + jawab banao aur padho (transport nahi)        2.8 µs             —      601×
HTTP + JSON, isi machine par, connection reuse (keep-alive)    35.2 µs    341.7 µs      7,683×
HTTP + JSON, isi machine par, har call naya TCP connection   125.0 µs    997.2 µs      27,299×
MODEL: doosri machine, same data center (+ 0.5 ms maana)    535.2 µs             —      1,16,907×
```

Teen runs (`captures/ex0-call-cost-1..3.txt`):

| Tareeka | Ek call (3 runs) | Function call se |
|---|---|---|
| Function call (best batch ausat) | 4–5 ns | 1× |
| JSON: request + jawab (best batch ausat) | 2.6–2.8 µs | ~590–610× |
| Loopback HTTP + JSON, keep-alive (median) | 33.7–35.2 µs (p99 0.29–0.34 ms) | ~7,600–7,900× |
| Loopback HTTP + JSON, naya connection (median) | 116–125 µs (p99 0.84–1.04 ms) | ~26,000–27,000× |
| + 0.5 ms same data center (maana) | ~0.53 ms | ~1.2 lakh× |

- **Video ka "100,000×" is hisaab se tabhi baithta hai** jab doosri machine ka ~0.5 ms (maana hua) jodo. Isi machine par HTTP + JSON
  bhi hazaaron guna. Anupaat is kaam aur is machine ke hain.
- **Function call mein V8 `checkStock` ko loop mein inline kar deta hai** — in-process ka asli faayda, par "ek jump instruction" ka naap nahi.
- **Local function bhi fail ho sakti hai** (exception, lock, anant loop, process ka marna). Network call naye failure jodti hai: timeout,
  connection reset, aur "kaam hua ya nahi?" ka shak. Video ka "function call kabhi fail nahi hoti" bada daava hai.

## ex1-fanout — 10 services, ek request

```
$ npm start -- ex1-fanout
services se jawab chahiye — ek ke baad ek (sequential) ya saath-saath (parallel fan-out)?

services   sequential p50 / p99      parallel p50 / p99     kitni requests ko kam se kam ek jhatka (theory)
       1      2.0 /   50.0 ms         2.0 /  50.0 ms          1.1%  (1.0%)
       3      6.0 /   54.4 ms         2.6 /  50.0 ms          3.1%  (3.0%)
      10     20.3 /   70.7 ms         2.9 /  50.0 ms          9.7%  (9.6%)
      30     61.5 /  158.5 ms         3.0 /  50.0 ms         26.1%  (26.0%)

Saanjha jhatka (ek hi pause, jaise caller ka GC, saari 10 calls par): 1.0% requests — 9.6% nahi.

Maanyatayein: jhatke alag-alag (independent), har jawab zaroori, koi bheed nahi, jhatka theek 50 ms.
```

- **"10 services × 2 ms = 20 ms"** (video) tab sahi jab calls ek ke baad ek hon. Parallel fan-out mein median sabse dheemi call jitna.
- **Fan-out dheemi call se takraane ka chance badhata hai:** jhatke alag-alag hon toh 10 calls par ~9.6% (1 − 0.99^10). Model mein jhatka
  theek 50 ms hai, isliye parallel ka p99 50 ms hi rehta hai — badhta hai dheemi requests ka hissa. Jhatka saanjha ho (jaise caller ka GC)
  toh exposure 1% hi. Bada pattern: Dean & Barroso, *The Tail at Scale* (2013); numbers is model ke.

## ex2-two-databases — ek transaction, saga, ya 2PC?

```
$ npm start -- ex2-two-databases
tareeka                            cases   ant mein galat   reader ne beech ki haalat dekhi   crash par locks atke   recovery crash ke saath galat
ek DB, ek transaction                 4            0                        0                    0             0 of 9
saga, progress sirf memory mein       3            2                        3                    0             6 of 6
saga + durable saga log               5            0                        5                    0             0 of 12
2PC (do-phase commit)                 5            0                        3                    4             0 of 12

(Order fail ho toh: 2PC coordinator zinda hai toh turant abort — locks sirf 1 crash case mein atke.)
```

- **Ek database:** ek ACID transaction — reader (dono tables ek hi snapshot mein padhe) ko ya purani haalat dikhti hai ya poori nayi;
  crash par rollback. Do alag Read Committed queries beech mein commit ke aar-paar padh sakti hain.
- **Saga, progress sirf memory mein:** stock ghata, order se pehle crash = stock gaya, order nahi, aur kisi ko yaad nahi.
- **Saga + durable log + receipts:** recovery log aur participant ki receipt (operation id) dekh kar idempotent steps dobara chalati hai —
  ant mein sahi, recovery khud crash ho tab bhi (12 mein se 0 galat). Global stock dekh kar andaza lagana galat hota. Par har run mein
  reader ne beech ki haalat dekhi: saga mein isolation nahi.
- **2PC:** video kehta hai "do databases par transaction bilkul nahi". Hota hai (2PC/XA, jaise Postgres ka `PREPARE TRANSACTION`): ant mein
  kabhi galat nahi. Par commit dono databases par alag pal mein lagta hai, toh alag-alag padhne wala reader beech ki haalat dekh sakta
  hai; aur COMMIT log hone ke baad bhi, jab tak faisla participant tak na pahunche, participant locks pakad kar intezaar karta hai.
  Recovery: coordinator lautkar log padhta hai — COMMIT mila toh poora karo, nahi mila toh abort (presumed abort; maana ki log salamat hai).

## ex3-copies — monolith ki copies: RAM vs DB connections

```
$ npm start -- ex3-copies
copies se scale karo. Har copy mein 0.5 GB ka code jo zyadatar idle (video ka "user profile"),
aur har copy ka apna DB connection pool (max 20). Postgres ka max_connections aam taur par 100 (kuch slots reserved).

copies   idle RAM (sab copies)   max DB connections (har pool bhar jaaye toh)   Postgres default (100) ke mukable
     2               1 GB                                40                     0.4×
    10               5 GB                               200                     2.0×
    50              25 GB                             1,000                    10.0×
   100              50 GB                             2,000                    20.0×

Split karke: image service ki 100 copies (DB nahi chahiye) + baaki app ki 4 copies → max DB connections 80.
```

- **Video sahi: idle RAM aksar sasta** (100 × 0.5 GB = 50 GB). Par busy samay mein har copy ka pool bhar sakta hai: 100 × 20 = 2,000
  connections ki maang — Postgres default (aam taur par 100) se 20 guna. Pool khaali shuru hote hain, zaroorat par bharte hain.
- **Ilaaj monolith mein bhi:** chhota pool, PgBouncer jaisa pooler, ya bhaari kaam ek alag worker process mein. Asli copies: lab 16 ex2.

## ex4-conway — log, raaste aur deploys

```
$ npm start -- ex4-conway
log      sab-se-sab raaste     8 ki teams: saari teams ke andar ke raaste   teams ke beech sambhavit raaste
    5                 10                  10                                         0
   20                190                  62                                         3
  100              4,950                 342                                        78
 5000        1,24,97,500              17,500                                  1,95,000

services   deploys   kram
       1         1   ek codebase, ek release (monolith ke andar ka function interface)
       2         3   producer dono naam likhe → 1 consumer naya naam padhein → producer purana band
       3         4   producer dono naam likhe → 2 consumer naya naam padhein → producer purana band
       5         6   producer dono naam likhe → 4 consumer naya naam padhein → producer purana band
```

- **Brooks (ch. 2):** agar har insaan ko har insaan se taal-mel karna pade toh n(n − 1)/2 sambhavit raaste. Ginti naapa hua kaam nahi, aur
  kisi headcount par "ab todo" ka faisla nahi deta — taal-mel code ki dependencies aur zimmedariyon par tika hai. 8 ki team ek misaal hai.
- **Conway (1968):** system ka dhaancha team ke baat-cheet ke dhaanche jaisa banta hai. Fowler: microservices mukhya roop se development
  organization ko dhaanchne ka auzaar hain (Conway's Law, 2022).
- **Field rename (todne wala badlaav):** monolith ke andar ka function interface = ek release. Services ke beech = expand/contract, kram
  ke saath deploys. Naya field jise purane readers ignore karein (tolerant reader) bina is kram ke ja sakta hai.

## Source ke daave aur sudhaar

| Video kehta hai | Sach / sudhaar | Kahan se |
|---|---|---|
| Function call 10 ns, network 1–2 ms, "100,000×" | Is laptop par function call ~4–5 ns, loopback HTTP ~34 µs; 0.5 ms data center (maana) jodo toh ~1.2 lakh× — kaam aur machine par tika | ex0 |
| Function call "kabhi fail nahi hoti" | Local function bhi fail ho sakti hai; network naye failure aur "hua ya nahi?" ka shak jodta hai | ex0 |
| 10 services = 20 ms network tax | Sirf ek ke baad ek calls par; parallel mein kam. Alag-alag jhatke hon toh dheemi call se takraane ka chance badhta hai (9.6% @ 10) | ex1, Tail at Scale |
| Do databases par transaction "full stop" nahi | 2PC/XA hota hai; locks aur blocking ki keemat, aur readers beech ki haalat dekh sakte. Saga ant mein sahi (durable log + receipts) par isolation nahi | ex2, Postgres `PREPARE TRANSACTION` |
| Module ko service banana "copy-paste" | Function call network call ban jaati hai, transactions toot'te hain, deploys kram maangte — saaf boundary madad karti hai, kaam bada hai | ex0, ex2, ex4 |
| "RAM sasta, poori copy chalao" | RAM aksar sasta; busy samay mein DB connections ki maang guna hoti hai — pooler ya alag worker | ex3 |
| "2024 DZone: 35% zyada debugging" → "35% engineering samay gaya" | Primary study nahi mili. Aur "35% zyada debugging" ka matlab "kul samay ka 35%" nahi — ganit ki galti | Codex review, 2026-11-16 |
| "2025 CNCF: 42% ne services wapas jodi", "aadhi industry wapas" | Primary source nahi mila. CNCF ki April 2025 report mein 42% **service mesh** adoption (2023 ke 50% se ghata) hai — microservices jodna nahi. Survey ke hisse se "aadhi industry" nahi banta | CNCF announcement 2025-04-01 |
| Service mesh (Istio), SRE team zaroori | Vikalp hain, zaroorat nahi; mesh traffic/observability/security deta hai, API ki compatibility design se aati hai | Istio docs |
| Field: monolith 10 min vs services 2–4 ghante; "80% byaaj" | Udaharan hain, naap nahi. Todne wale badlaav par expand/contract; naya field (tolerant reader) aasaan | ex4, Fowler ParallelChange / TolerantReader |
| Security: card data alag service = baaki audit se bahar | Seema tabhi chhoti jab asli alagaav (segmentation) ho; jude hue systems scope mein rehte hain | PCI SSC FAQ 1115, 1135 |
| "Top 50 websites ke alawa scaling argument myth" | Bada daava; faisla apne naap se (load, team, deploy ka dard) | — |
| Conway 1968, Brooks; teams 8–10 | Conway aur Brooks sahi; 8–10 ki team ek chalan hai, Conway ka niyam nahi. Fowler ka "organization structure" wala kathan sahi (2022) | ex4, Conway 1968, Fowler ConwaysLaw |
| Microservices ke chaar signals (org, hardware, tech, security) | Achhe kaaran, par shart ke saath; fault isolation (ek hissa gire toh baaki chale) bhi | lab 39 (bulkhead) |
| Stack Overflow, Shopify, Basecamp monolith | Stack Overflow (bada core app + kuch services, 2016), Shopify (modular monolith, 2019), Basecamp ("Majestic Monolith", 2016) | Nick Craver; Shopify Engineering; DHH |

## Sources

- Melvin Conway, *How Do Committees Invent?* (Datamation, 1968) — https://www.melconway.com/Home/Committees_Paper.html
- Fred Brooks, *The Mythical Man-Month* (1975) — Brooks's law, n(n − 1)/2 communication paths
- Jeffrey Dean, Luiz André Barroso, *The Tail at Scale* (CACM, 2013) — https://research.google/pubs/the-tail-at-scale/
- Martin Fowler, *MonolithFirst* (2015) — https://martinfowler.com/bliki/MonolithFirst.html
- Martin Fowler, *Conway's Law* (2022) — https://martinfowler.com/bliki/ConwaysLaw.html
- PostgreSQL docs, `PREPARE TRANSACTION` — https://www.postgresql.org/docs/current/sql-prepare-transaction.html
- CNCF, research announcement (2025-04-01; service-mesh 42%) — https://www.cncf.io/announcements/2025/04/01/cncf-research-reveals-how-cloud-native-technology-is-reshaping-global-business-and-innovation/
- Shopify Engineering, *Deconstructing the Monolith* (2019) — https://shopify.engineering/deconstructing-monolith-designing-software-maximizes-developer-productivity
- PostgreSQL docs, `max_connections` — https://www.postgresql.org/docs/current/runtime-config-connection.html

## Files

| File | Kya |
|---|---|
| `lib/callcost.js` | ex0: function call, JSON, loopback HTTP server aur client |
| `lib/fanout.js` | ex1 tail latency model |
| `lib/twodb.js` | ex2 protocols aur crash points |
| `lib/arith.js` | ex3, ex4 ka hisaab |
| `tools/*.js` | Har exercise ka tool |
| `test/core.test.js` | 4 tests |
| `captures/` | Har exercise ka output (ex0: 3 runs) + `test.txt` |

## Practice

1. ex1 mein jhatka 1% se 0.1% karo. 30 services par kitni requests ko jhatka?
2. ex2 mein reader ko sirf saga ke "log done" ke baad padhne do (jaise status "pending" chhupana). Beech ki haalat ka kya hota hai?
3. ex3 mein pool 20 se 5 karo. 100 copies par connections?
4. ex4 mein 40 log 5 teams mein hain. Team-to-team raaste kitne?
