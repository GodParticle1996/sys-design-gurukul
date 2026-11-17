# 🧪 Lab 65 — Instagram shuru se: budget sheet, seedha upload, like ka toofan, feed, duniya bhar, aur galti ka daayra

System Gurukul → 🧪 First Principles → Instagram: sab jodkar (Kyun · Kaise · Code · Kab). Video 15/15 — poori series ka capstone.
Node 24+, koi package install nahi. Captures Node v24.18.0 par, WSL2 machine par. ex1 apne hi process mein `127.0.0.1` ke random
ports par do chhote HTTP servers chalata hai (bahar kuch publish nahi); baaki exercises seedha hisaab, seeded model ya asli
merge/crypto code hain.

Course mein bahut kuch pehle se hai, aur lab 65 use dohraata nahi: 🏢 Instagram story level (logical shards, mapping, IDs),
FP7 sharding (lab 57), FP8 CAP aur CRDT (lab 58), FP10 caching aur thundering herd (lab 60), FP12 retries aur metastable failure
(lab 62), FP13 fan-out tail (lab 63), FP14 observability (lab 64), lab 14 (asli Reed-Solomon erasure coding), labs 26/52 (hedging),
labs 21/59 (TrueTime). Lab 65 un hisson ko naapta hai jo video naye jodta hai: poora budget sheet, seedha upload, like button ka
toofan, push/pull feed ka asli tradeoff, duniya bhar mein hedging/quorum/conflicts, aur cells + crypto-shredding.

```bash
npm start -- ex0-budget    # Hisaab: video ka poora budget sheet, blob-in-DB ka WAL, erasure coding, roshni aur handshakes
npm start -- ex1-upload    # ASLI HTTP (ek hi machine par): presigned URL, resumable chunks, orphan + lifecycle, chhed-chhaad
npm start -- ex2-likes     # Model + asli code: hot row vs counter rows, retry par counter vs set, regions mein LWW vs G-Counter
npm start -- ex3-feed      # Model: pull vs push vs hybrid, followers ka Zipf model (video ke numbers se tune), VIP seema
npm start -- ex4-global    # Seeded model + asli code: hedged requests (aazaad vs juda), quorum write, LWW vs vector clock
npm start -- ex5-blast     # Hisaab + asli AES-256-GCM: cells ka blast radius, crypto-shredding
npm test                   # 6 tests
npm run mutate             # 39 jaan-boojh kar daali galtiyan — pehle bina badle tests pass hone chahiye, phir har galti par fail (test/mutate.js)
docker compose --profile ex1-upload up --build   # supplied, untested
```

**Is machine par Docker nahi; compose chalaya nahi gaya.**

## Lab ka daayra (kya asli, kya model)

- **ex0:** sirf hisaab; saare inputs video ke maane hue numbers (50 crore DAU, 3 MB/photo, 200 views/din, $0.05/GB...).
- **ex1 asli:** ek chhota "object store" (HMAC-SHA256 se sign kiye URL jaanchta hai, offset par chunks jodta hai, tags rakhta hai) aur
  ek "app server" (sirf JSON; har upload session ka size aur SHA-256 yaad rakhta hai). Asli HTTP; ghadi **nakli** taaki 15 min ki
  expiry aur 24 ghante ka lifecycle turant dikhe. S3 nahi hai. Lab ka apna niyam: PUT wala signature HEAD (offset padhna) bhi
  karne deta hai; S3 ka presigned URL ek hi method ka hota hai.
- **ex2:** viral photo ka 1 ms time-step model (10,000 likes/s, 20,000 feed requests/s, saanjha worker pool, 5 s timeout — maane
  hue; kaun pehle worker le — likes, feed ya baari-baari — ek setting hai). Retries aur regions seeded; regions ki copies der se,
  ulte kram mein aur kabhi do baar pahunchti hain, ant mein sab. G-Counter/LWW ka merge code asli.
- **ex3:** koi graph nahi banaya. Followers ka model f(r) = 60 crore · r^−α, 100 crore users; α aise chuna ki average 300 ho
  (video ka "normal user"). Posts sab users mein barabar maane. Asli social graph bhi bhaari-poonch wala hota hai, par theek r^−α wala curve nahi.
- **ex4:** shard latency seeded (median 10 ms, p95 ~20 ms, 1% chance 200 ms). Round trips (Tokyo↔Virginia ~150 ms, Tokyo↔Frankfurt
  ~230 ms) **maane** hue. Conflict code asli, chhote records par.
- **ex5:** cells ka seedha hisaab; crypto-shredding asli `node:crypto` AES-256-GCM se.

## ex0-budget — budget sheet

| | Video | Hisaab |
|---|---|---|
| Uploads/s (average · peak ×3) | ~1,150 · 3,500 | 1,157 · 3,472 |
| Naya storage (din · saal) | 300 TB · 110 PB | 300 TB · 109.5 PB |
| Views/s · egress | 1.2 million · 240 GB/s, 1.9 Tbps | 11.6 lakh · 231.5 GB/s, 1.85 Tbps |
| Read : write | 1,000 : 1 | 1,000 : 1 |
| Egress bill ($0.05/GB, list price) | $1M/din | $10 lakh/din; 30% chhoti images → $3 lakh/din bachat |
| Likes/s (average · peak) | 57,000 · 170,000 | 57,870 · 1,73,611 (uploads se ~50×) |
| Photos DB ke andar: WAL | 6 GB/s | 5.8 GB/s average, 17.4 GB/s peak; 5 MB = 2,506 TOAST chunks |
| 150 byte metadata row, 1 GB RAM mein | 1 crore | 1 GiB mein 71.6 lakh raw, ~60.7 lakh Postgres ke 27 byte header ke saath |
| 110 PB: 3 copies vs 10+4 erasure coding | 330 vs 154 PB | Sahi; koi bhi 4 fragment kho sakte; repair 10 fragment padhta hai (lab 14) |
| NY↔Tokyo, fibre | 54 ms ek taraf | 54.3 ms (10,850 km); TCP + TLS 1.2 = 3 round trip, TLS 1.3 = 2, QUIC = 1 |

Budget ka hisaab sahi hai. Mudda bhi sahi: Instagram "delivery company" hai — egress aur CDN bill chalate hain.

## ex1-upload — photo seedha storage mein

- 1 MB photo: app server ne **138 byte** JSON body padhi (session ka size + SHA-256 bhi), object store ne 10,00,000 byte. App ka
  bandwidth, connections aur memory bachi. Video ka "dheema upload ek worker pakadta hai" blocking (har request ek worker) server par
  sahi; Node jaisa async server thread nahi rokta, par bytes ka bojh phir bhi uthata hai.
- 5 MB, 500 KB chunks, 9 chunk ke baad connection gaya: `HEAD` ne batata ki 45 lakh byte pahunch chuke; sirf 5 lakh dobara bheje.
  **Dhyan:** S3 multipart mein har part 5 MiB se 5 GiB (aakhri part chhota chal sakta), zyada se zyada 10,000 parts — 500 KB ke
  chunks seedhe S3 multipart se nahi chalenge. Apna resumable endpoint ya Google Cloud Storage jaisa resumable upload (chunk 256 KiB
  ke multiple) chahiye.
- Orphan: phone upload ke baad "ho gaya" bolne se pehle band. Lifecycle rule `status=pending` tag wale 24 ghante se purane objects
  hataata hai; commit par tag `final`. 23 ghante par kuch nahi gaya, 25 par sirf orphan gaya. **Video ka tarika** ("24 ghante se
  purani har file hatao jab tak permanent tag na ho") seedha nahi banta: S3 lifecycle filter prefix, tags aur size se objects
  *chunta* hai (AND ke saath); "tag nahi hai" jaisa ulta filter docs mein nahi. Isliye pending tag upload ke waqt hi lagao. (`tmp/` prefix wala rule chuno toh commit par photo ko
  final key par copy karna padta hai — tag badalne se prefix wala rule nahi rukta.)
- Doosri file ka naam daala → 403. Expiry badhayi ya method badla → 403. 16 min baad (URL 15 min ka) → 403.
- **Upload ka contract (app ka niyam):** URL beech mein expire hua → same key ka naya URL, baaki 100 byte, commit; adhoori photo ka
  commit → 409; reply kho jaane par dobara commit → same photo id; publish ke baad bytes jodna → 409. Presigned URL akela aisi
  guarantee nahi deta: S3 ka URL expiry tak dobara chal sakta hai aur same key badal sakta hai. URL app ka SDK apni credentials se
  local sign karta hai — S3 se poochhna zaroori nahi.

## ex2-likes — like ka toofan

| 10 s, 1,00,000 likes | Hue | Worker na mila | Timeout | Line mein | Feed fail |
|---|---|---|---|---|---|
| 1 row, 2,000 workers, likes pehle | 9,999 | 88,001 | 0 | 2,000 | 1,96,188 (pehla 177 ms par) |
| 1 row, 2,000, baari-baari | 9,999 | 88,041 | 0 | 1,960 | 1,76,186 |
| 1 row, 2,000, feed pehle | 9,999 | 88,401 | 0 | 1,600 | 0 |
| 1 row, 60,000 workers, likes pehle | 9,999 | 0 | 40,002 | 49,999 | 0 |
| 100 counter rows, 2,000 | 99,990 | 0 | 0 | 10 | 0 |

- Garam row har haal mein ~1,000 likes/s deti hai (row ka lock ~1 ms). Baaki app par asar pool ke niyam se tay hota hai: likes ko
  pehle worker mile toh 177 ms mein pool bhara aur feed gira (video ka "ek photo ne poori app gira di" — ek scenario); feed ko pehle
  mile toh feed bacha, likes turant mana; bada pool likes ke mana ko timeout mein badal deta hai. Likes ko alag pool (bulkhead,
  lab 39) do; asli ilaaj store ki raftaar. Redis jaisa counter + har 5 s ek batch: DB writes 10,000/s → 0.2/s; keemat: Redis bina
  persistence gire toh aakhri 5 s ke likes (is photo ke ~50,000).
- Retry (2% replies kho gaye): counter +1 se 2.0% zyada; set mein user id — bilkul sahi. Like ek haalat hai, event nahi.
- Teen regions (Tokyo 5,000 + Frankfurt 3,000 + Virginia 1,000; copies der se, ulte kram mein, kabhi do baar): LWW har region par
  7,012; naye likes jodte jaana 11–14 hazaar; **G-Counter har region par 9,000**. Shart: har like ek hi region mein gina jaaye — ek
  user ka like Tokyo mein aur retry Frankfurt mein ho toh G-Counter 2 ginta hai, user id ka set 1. Unlike ke liye OR-Set jaisa
  CRDT chahiye (lab 58).

## ex3-feed — pull, push ya dono

| VIP seema | VIP accounts | Push writes/s (peak) | Busy (kshamata 10 lakh/s) | Sabse bada ek post (akela) | VIP lists har feed read |
|---|---|---|---|---|---|
| koi nahi (pure push) | 0 | 10,41,600 | 104.2% | 60 crore (600 s) | 0 |
| 10 lakh | 4,018 | 9,88,642 | 98.9% | ~10 lakh (1 s) | 15.3 |
| 1 lakh | 79,672 | 9,28,809 | 92.9% | ~1 lakh (100 ms) | 32.5 |
| 10,000 | 15.8 lakh | 8,10,173 | 81.0% | 10,000 (10 ms) | 66.7 |

- Pull: 300 follow par 95.1%, 500 par 99.3% feed loads kisi dheeme shard se takraate hain (video ka 99.3% sahi).
- Pure push: ausat 300 followers × 3,472 posts/s ≈ 10.4 lakh writes/s (video ka "~10 lakh" sahi) — par video ki hi kshamata
  (10 lakh/s) se zyada: **104.2% busy**, line bina kisi celebrity ke bhi badhti hai. Hybrid (1 lakh seema) writes ~11% ghataata hai
  → 92.9%: line khaali ho sakti hai. Itne bhare system mein 11% bada farq hai (FP14 ka queue ganit).
- Sabse bada ek post: 60 crore writes = 10 minute ka kaam akela (hybrid mein ~100 ms). Sab posts ek hi FIFO line mein hon (maana),
  toh us beech baaki posts peeche. Keemat: har feed read ~32 VIP lists jodta hai — video ka "kuch darjan" model se mel. Seema
  followers ki sabse chhoti ginti se bhi neeche (jaise 50) ho toh sab VIP — model seema laga deta hai.
- Inbox: 50 crore × 500 × 8 byte = 2 TB sirf ids; Redis ka per-key/list overhead aur replicas alag — kai guna, phir bhi sambhalne layak.

## ex4-global — duniya bhar mein

| 100 shards ka page | Page p50 | Page p99 | 100 ms se dheeme | Extra requests |
|---|---|---|---|---|
| Hedge nahi | 208.3 ms | 225.3 ms | 63.25% | 0% |
| 20 ms baad replica (jhatke aazaad) | 29.8 ms | 204.8 ms | 1.03% | 5.1% |
| … aadhe jhatkon ka kaaran replica par bhi | 32.6 ms | 222.7 ms | 39.91% | 5.1% |
| … har jhatka replica par bhi | 208.3 ms | 225.2 ms | 63.75% | 5.1% |

- Video ka hisaab: (1%)² ko "0.001 ya 0.01%" kaha — sahi 0.0001 = 0.01%; 1 − 0.9999¹⁰⁰ = 0.995% — model ke 1.03% se mel.
- Hedge tabhi kaam karta hai jab replica ka jhatka alag ho. Page ka p50 ~30 ms ho jaata hai (lagbhag har page kisi shard par 20 ms
  ka intezaar karta hai). Replica purana data de sakta hai; jo request dobara chalna safe nahi, use hedge mat karo.
- Strongly consistent write (Spanner jaisa, ek Paxos group, leader-local): majority ka Paxos "haan" + commit wait (saath-saath).
  TrueTime [now − ε, now + ε] deta hai; commit wait ~2ε (ε = 7 ms maano toh ~14 ms). Leader Tokyo, 3 voting regions (maane hue RTT)
  → ~150 ms, video ka "sirf 7 ms" nahi; paas-paas ke regions (2–3 ms) mein ~14 ms — tab commit wait hi bada hissa. Disk, CPU aur
  kai groups wale transaction ka kharcha nahi joda.
- Conflicts (Tokyo ki ghadi 5 ms aage): poori row ka LWW Paris ka phone kho deta hai; **har column ka LWW (Cassandra)** dono
  rakhta hai; same field par aage chalti ghadi pehle wale edit ko jita deti hai; vector clock "saath-saath" pakad leta hai. Barabar
  timestamp par har replica ek hi jeet chune, isliye pakka niyam chahiye (lab: writer id; Cassandra: value ki tulna).

## ex5-blast — galti ka daayra aur bhoolne ka haq

- 100 cells × 1 crore: galat config 10 min mein pakdi gayi → global push 100%, waves (1 → 5 → 25 → 100, 30 min bake) 1%;
  45 min par 5%, 75 min par 25%. Cells tabhi bachaate hain jab config, database, control plane alag hon.
- Crypto-shredding (asli AES-256-GCM): u2 ki DEK mitayi → 4 encrypted copies (db, kafka, backup, cache) mein se padhne layak 0;
  1,000 random keys mein se 0 kaam aayi; u1 theek. Par ek debug log line plaintext mein email abhi bhi rakhti hai.

## Source ke daave aur sudhaar

| Video kehta hai | Sach / sudhaar | Kahan se |
|---|---|---|
| Budget sheet (1,150 uploads/s, 110 PB/saal, 1.2M views/s, 1,000:1, $1M/din egress, 57k likes/s) | Hisaab sahi; egress ka $0.05/GB list price hai, is paimaane par asli daam alag | ex0 |
| Blob Postgres mein: 5 MB → TOAST, WAL 6 GB/s | Sahi (5.8 GB/s, 2,506 chunks). "Cache hit 99% → 10%", "pg_dump 3 hafte" — udaharan, naap nahi | ex0 |
| 150 byte rows: 1 GB mein 1 crore | 1 GiB mein ~72 lakh raw, ~61 lakh header ke saath | ex0 |
| 10 data + 4 parity = 1.4×, koi 4 kho sakte | Sahi; repair ke liye 10 fragment network se padhne padte | ex0, lab 14 |
| 500 KB chunks mein resumable upload (S3 ke saath) | S3 multipart part kam se kam 5 MiB (aakhri chhod kar); 500 KB ke liye apna ya GCS jaisa resumable API | ex1 |
| Lifecycle: "permanent tag na ho toh 24 ghante baad hatao" | Lifecycle filter tag/prefix/size se chunta hai; "tag nahi" filter nahi — pending tag lagao (ya `tmp/` prefix + commit par final key par copy) | ex1 |
| NY–Tokyo 54 ms ek taraf; TCP + TLS 1.2 = 3 round trip | Sahi (naye connection ka hisaab; Retry/resumption alag) | ex0 |
| QUIC ka "cryptographic" connection ID; network badle toh connection "seamlessly" chalta | Connection ID routing ke liye ek opaque pehchaan hai; network badalne par migration path validation ke baad hota hai aur band bhi kiya ja sakta hai. QUIC streams ke beech head-of-line blocking hatata hai, ek stream apne khoye bytes ka intezaar phir bhi karta hai (RFC 9000) | — |
| App server object store se presigned URL "maangta" hai | SDK apni credentials se local sign karta hai, S3 se poochhna zaroori nahi. URL ek key + operation ka hai, expiry tak dobara chal sakta hai; "poori, sahi photo, ek baar" app ka niyam hai (size + hash, idempotent commit) | ex1 |
| Snowflake 41/10/12; Instagram ne shard id ID mein daali; ID se database bina lookup ke | 41/10/12 Twitter Snowflake ka hai; Instagram (2012): 41 bit time, 13 bit logical shard, 10 bit sequence. ID se **logical** shard milta hai; logical → physical naksha phir bhi chahiye (shard hilne par) — Instagram level | — |
| UUID random hai, isliye sort nahi hota aur B-tree bigaadta | UUIDv4 ke liye sahi; UUIDv7 time-ordered hai (RFC 9562). Snowflake ka time-kram alag machines ki ghadi par tika — sakht real-time kram nahi | — |
| 1,000 → 1,500 shards par "almost every user" hilta hai | Modulo par ~2/3 hilte hain (1/3 apni jagah). Logical/virtual shards se mapping badlo — Instagram level aur lab 57 | lab 57 |
| 100 shards × 1% → 63.4%; 500 → 99.3% | Sahi, jhatke aazaad hon tab | ex3, lab 63 |
| 1 lakh likes × 1 ms lock → aakhri ko 100 s; ek photo poori app gira de | Garam row ~1,000/s — sahi. App ka girna saanjhe pool aur admission ke niyam par tika: likes pehle → 98% feed fail; feed pehle → 0 | ex2 |
| Like = set, isliye retry safe | Sahi (2% retries par counter 2% zyada, set bilkul sahi) | ex2 |
| Inbox 500 × 8 byte × 50 crore = "theek 2 TB", "kuch dollar/ghanta" | 2 TB sirf ids; Redis overhead aur replicas alag. AWS x2iedn.16xlarge (2,048 GiB, N. Virginia, on-demand, Nov 2026): ~$13.34/ghanta ≈ $320/din — "kuch dollar" nahi | ex3 |
| Hybrid feed celebrities ko bachaata hai; "10 lakh pushes/s aaraam se" | Video ke apne numbers par pure push 104% busy (10 lakh/s kshamata); hybrid 93% — 11% kami line ko khaali hone deti hai. Sabse bura ek post 600 s → 100 ms; har read ~32 VIP lists | ex3 |
| Request coalescing: 500 queries → "theek 1" | Ek server ke andar ka in-flight map ek server par 1 karta hai; 100 app servers hon toh DB par ~100 (lab 60, FP10) | lab 60 |
| Social graph ke liye SQL chhodo; adjacency lookup O(1); Bloom filter ka "nahi" pakka | Forward + reverse lists SQL mein bhi rakh sakte ho — faisla sharding aur access pattern ka. List dhoondhna O(1), poori list padhna nahi. Bloom ka "nahi" sirf usme daale gaye items par pakka; purana filter naya follow chhod sakta hai (lab 60) | lab 60 |
| Explore: do stage mein "poori duniya" score, 50 + 100 ms | Retrieval + ranking ek saral roop; candidate stage se chhoota item ranker kabhi nahi dekhta. Instagram ka published design: retrieval, first-stage ranking, second-stage ranking, final re-ranking. Samay maane hue | — |
| 50% packet loss = 5 lakh fail requests, phir ek second mein 6 lakh; breaker = DB ko 30 s ki shanti | Packet loss request failure nahi — TCP retransmit, deadline aur retry timing se aamad banti hai. Har client ka breaker global shanti nahi. Metastable recovery ke liye lab 62 aur lab 60 dekho | lab 62 |
| Hedged request: (1%)² = "0.001 ya 0.01%" | 0.0001 = 0.01%. Tabhi jab replica ka jhatka alag ho; juda ho toh bekaar. ~5% extra load | ex4 |
| Overload mein LIFO | Facebook ka "adaptive LIFO" sahi pattern; purani requests timeout ho chuki hoti hain | — |
| Spanner: "sirf 7 ms" ki keemat, Tokyo se bina coordination ke global reads | Har write Paxos majority (regions ke beech round trip) + commit wait ~2ε (ε = 7 ms par ~14 ms), saath-saath; snapshot read local tabhi jab replica us samay tak up-to-date ho | ex4 |
| Cassandra LWW poori row par: bio vs phone mein ek update gaya | Cassandra har column par LWW karta hai — alag columns dono bachte; same column par ghadi tay karti hai | ex4 |
| CockroachDB "Spanner ka open-source jodidaar" | Spanner-prerit hai par atomic clocks nahi — hybrid logical clocks + uncertainty restarts; license bhi badal chuka hai | — |
| Facebook 2021: "galat config flag" | Backbone capacity jaanchne wali command ne saare backbone connections gira diye; phir DNS servers ne BGP advertisements wapas le liye | — |
| Route 53 user ID ko cell 42 par bhejta hai | DNS user ID nahi dekhta; user → cell ka naksha ek patli routing layer rakhti hai | ex5 |
| GDPR: har nishaan 30 din mein mitao | Art. 12(3) jawab/jaankari dene ki seema hai (aam taur par ek mahina, shart ke saath 2 mahine aur). Art. 17 mitaane ka haq "bina der" deta hai, apni sharton aur chhooton ke saath. Dono mein se koi "theek 30 din mein har copy" ka vaada nahi. Crypto-shredding ko har regulator mitaana maane, pakka nahi | ex5 |
| Crypto-shredding se "thermodynamically impossible" | 256-bit key ke bina AES-GCM padhna asambhav maana jaata hai — par plaintext kahin aur (logs, exports) gaya ho toh nahi bachata | ex5 |

## Sources

- AWS, *Amazon S3 multipart upload limits* — https://docs.aws.amazon.com/AmazonS3/latest/userguide/qfacts.html
- AWS, *S3 Lifecycle rules: filters* — https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html
- Google Cloud, *Performing resumable uploads* (256 KiB chunks) — https://cloud.google.com/storage/docs/performing-resumable-uploads
- Instagram Engineering, *Sharding & IDs at Instagram* (2012) — https://instagram-engineering.tumblr.com/post/10853187575/sharding-ids-at-instagram
- Corbett et al., *Spanner: Google's Globally-Distributed Database* (OSDI 2012) — https://research.google/pubs/spanner-googles-globally-distributed-database-2/
- Apache Cassandra docs, *Dynamo* (per-column last-write-wins) — https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html
- GDPR Article 12 — https://gdpr-info.eu/art-12-gdpr/
- Meta Engineering, *More details about the October 4 outage* (2021) — https://engineering.fb.com/2021/10/05/networking-traffic/outage-details/
- AWS, *Sharing objects with presigned URLs* — https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html
- RFC 9000 (QUIC) — https://www.rfc-editor.org/rfc/rfc9000.html · RFC 9562 (UUIDv7) — https://www.rfc-editor.org/rfc/rfc9562.html
- Meta Engineering, *Scaling the Instagram Explore recommendations system* (2023) — https://engineering.fb.com/2023/08/09/ml-applications/scaling-instagram-explore-recommendations-system/
- GDPR Articles 12 and 17 (official text) — https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng
- Jeffrey Dean, Luiz André Barroso, *The Tail at Scale* (CACM, 2013) — https://research.google/pubs/the-tail-at-scale/

## Files

| File | Kya |
|---|---|
| `lib/budget.js` | ex0: budget sheet, TOAST, rows/GiB, storage, fibre aur handshakes |
| `lib/upload.js` | ex1: object store + app server (asli HTTP), presign, resume, lifecycle |
| `lib/likes.js` | ex2: viral time-step model, retries, region counters (LWW, naive, G-Counter) |
| `lib/feed.js` | ex3: follower-count model, hybrid threshold, pull slow chance, inbox bytes |
| `lib/global.js` | ex4: hedged pages, quorum write, row/cell LWW, vector clocks |
| `lib/shred.js` | ex5: cell rollout waves, envelope encryption, crypto-shredding |
| `tools/*.js` | Har exercise ka tool |
| `test/core.test.js` | 6 tests: budget, upload contract (asli HTTP), likes accounting aur admission, feed thresholds, hedging/quorum/LWW/vector clocks, cells aur crypto |
| `test/mutate.js` | `npm run mutate`: pehle baseline pass, phir 39 jaan-boojh kar daali galtiyan; crash/timeout ko "pakda" nahi ginta |
| `captures/` | Har exercise ka output + `test.txt` |

## Practice

1. ex0 mein 200 views/din ki jagah 100 karo. Egress bill aur read:write kya hue?
2. ex1 mein lifecycle 24 ghante se 1 ghanta karo. Ek dheema (2 ghante ka) upload kya jhelega?
3. ex2 mein counter rows 100 se 10 karo. Feed fail kab shuru hote hain?
4. ex3 mein VIP seema 10 lakh rakho. Writes, sabse bada post aur VIP lists ka kya hua?
5. ex4 mein hedge 20 ms se 50 ms baad bhejo. Extra load aur dheeme pages?
