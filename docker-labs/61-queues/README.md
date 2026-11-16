# 🧪 Lab 61 — Queues aur Streams: buffer, queue vs log, append, partitions, backpressure, crash points

System Gurukul → 🧪 First Principles → Async: Queue vs Stream (Kyun · Kaise · Code · Kab).
Node 24+, koi package install nahi. Captures Node v24.18.0 par, WSL2 machine par. Koi port nahi.

EDA course ke labs asli processes chalate hain: lab 44 (save/publish gap), lab 48 (burst, retention, dead-letter), lab 49
(duplicate charge + idempotency key, SQLite), lab 50 (store-and-publish crash). Lab 61 woh naapta hai jo video bolta hai par
koi lab nahi naapta: spike ke baad backlog kab khatam hota hai, queue aur log ka asli farq (code mein), disk par append kitna
tez hai, partition key kram kaise bachaati hai, backpressure ke chaar raaste, aur har crash point par kya hota hai.

```bash
npm start -- ex0-buffer         # MODEL: spike ke baad backlog, worker ki kshamata, retention
npm start -- ex1-queue-vs-log   # ASLI code: visibility timeout, consumer groups, replay vs retention
npm start -- ex2-append         # ASLI disk: seedha vs random 4 KB overwrite vs 1 MB batch (O_DIRECT)
npm start -- ex3-partitions     # Kafka murmur2: key se kram, groups ki chhat, hot key, 6 → 8 partitions
npm start -- ex4-backpressure   # MODEL: drop, block, reject, autoscale vs DB ki had, poison message
npm start -- ex5-crash-points   # ASLI ginti: har crash point par idempotency aur dual write vs outbox
npm test                        # 6 tests
docker compose --profile ex0-buffer up --build   # supplied, untested
```

**Is machine par Docker nahi; compose chalaya nahi gaya.** Container mein ex2 ke numbers alag honge (overlay filesystem).

## Lab ka daayra (kya asli, kya model)

- **ex0 model:** 1 s ke kadam, seedha hisaab. Sync side: 100 threads, har signup 2 s thread pakadta hai.
- **ex1 asli code:** `lib/queue.js` (SQS standard jaisa: visibility timeout, receipt, delete) aur `lib/log.js` (ek Kafka partition
  jaisa: append, offsets, retention). Koi asli SQS ya Kafka nahi chalta.
- **ex2 asli:** temp folder mein pehle se bani 64 MiB file par asli overwrites, har row ke ant mein fsync. WSL ki disk ek virtual disk hai.
- **ex3:** partition hash asli (Kafka Java client ka murmur2, uske test vectors se jaancha). Kram wala hissa model hai
  (consumers ki raftaar seeded random).
- **ex4 model:** 1 s ke kadam; DB ki had ke upar ki koshish timeout maani gayi.
- **ex5 asli ginti:** har crash point aur do workers ke har kram ko gin kar dekha; koi asli DB ya queue nahi (woh labs 44 aur 49 mein).

## ex0-buffer — spike ke baad backlog kab khatam?

```
$ npm start -- ex0-buffer
sync:  kshamata 50/sec → spike ki 60,000 mein se 3,000 serve, 57,000 ko error (95%)
async: 60,000 mein se 60,000 ko turant "ho gaya" (queue mein); kaam baad mein.

worker kshamata   spike ke ant par backlog   sabse lamba intezaar   backlog khaali   7 din baad backlog
10/sec                  59,400                   99 min          kabhi nahi       59,400
12/sec                  59,280                   82 min          8.2 ghante            0
20/sec                  58,800                   49 min              98 min            0
50/sec                  57,000                   19 min              24 min            0
```

- **Load leveling sach hai:** async mein web server sirf queue mein daalta hai, isliye spike mein 95% errors ki jagah sabko "ho gaya".
- **Par video ka "10 minute late" sirf ~6 s ke spike par banta hai.** 60 s ke spike par intezaar ~99 minute.
- **Worker ausat traffic se tez hona chahiye.** Video ke numbers (normal 10/sec, worker 10/sec) par backlog **kabhi** khatam nahi
  hota. Queue load ko barabar tabhi karti hai jab worker ke paas khaali kshamata ho.
- **Retention:** worker 5 din band, SQS default retention 4 din → pehle din ke 8,64,000 messages gaye. "Ek bhi message nahi
  khoya" tabhi jab worker retention ke andar laut aaye.

## ex1-queue-vs-log — post office vs scroll, code mein

```
$ npm start -- ex1-queue-vs-log
unique jobs: 1,000   do baar chale: 6   (B ke 5 + 1 lambi job)
lambi job ka delete: kuch nahi mita — receipt purani; job doosre worker ko mil chuki thi (SQS: purani receipt par delete ki guarantee nahi)

ek hi queue, teeno services padhti hain:    email 334, analytics 333, fraud 333   ← har service ko sirf ek-tihaai
ek log, har service ka apna offset (group):  email 1000, analytics 1000, fraud 1000

retention  7 din (Kafka default): replay mein  7,000 of 14,000 events   ← purane din disk se mit chuke
retention 14 din                : replay mein 14,000 of 14,000 events   
retention 30 din                : replay mein 14,000 of 14,000 events   
task queue (delete on ack):            replay mein      0 of 14,000 events
```

- **Task queue at-least-once hai, "theek ek baar" nahi.** Video pehle kehta hai "har image theek ek worker, theek ek baar", baad
  mein khud at-least-once batata hai. Delete se pehle crash, ya visibility timeout se lamba kaam = same job do baar.
- **Fan-out:** ek queue ko teen services padhein toh har ek ko ek-tihaai milta hai (competing consumers). Har service ko poora
  chahiye toh har service ki alag queue (jaise SNS → SQS), ya log jismein har group ka apna offset.
- **Replay utna hi jitna retention.** Kafka ka default `log.retention.hours` = 168 (7 din). Video ka "offset 2 hafte peeche le
  jao" default par aadha hi milta hai. Retention ya poora archive pehle se chuno. Compaction har key ki aakhri value rakhta hai,
  poori history nahi — dobara ginti ke kaam nahi aata.
- **Naya consumer group:** lab ka naya group shuru se padhta hai (maana hua). Asli Kafka mein naya group `auto.offset.reset`
  (default `latest`) se shuru hota hai; purane events ke liye `earliest` ya seek chahiye.

## ex2-append — seedha vs random overwrite, aur batching (is SSD par)

```
$ npm start -- ex2-append
ASLI: is machine ki disk par 64 MiB ki pehle se bani file, temp folder mein. Same bytes, alag kram aur size. Har row ke ant mein ek fsync.
   File pehle se poori likhi hai, isliye ye overwrite hai — asli Kafka segment ka badhna (append) ya broker nahi naapa.

tareeka                                                     MiB/sec   ek write (ausat, fsync samet)
seedha overwrite, 4 KB writes, O_DIRECT (page cache nahi)       48   81.0 µs
random jagah, 4 KB writes, O_DIRECT                             46   84.8 µs
seedha overwrite, 1 MB writes, O_DIRECT (batching)             336   3.0 ms
seedha overwrite, 4 KB writes, page cache + ek fsync           210   18.6 µs
random jagah, 4 KB writes, page cache + ek fsync               227   17.2 µs
```

Teen runs (`captures/ex2-append-1..3.txt`):

| Tareeka | MiB/sec (3 runs) |
|---|---|
| 4 KB seedha overwrite, O_DIRECT | 42–48 |
| 4 KB random, O_DIRECT | 43–46 |
| 1 MB batch, O_DIRECT | 336–823 |
| 4 KB, page cache + ek fsync | 210–815 |

- **Ye overwrite hai, asli append nahi.** File pehle se poori likhi hai; Kafka ka segment badhna, broker, replication ya network
  nahi naapa. "Ek write" column = poore loop + aakhri fsync ka ausat.
- **Is SSD par seedha vs random lagbhag barabar (1.0–1.1×).** Video ka "random access maarta hai" spinning disk (head ka seek,
  ~5–10 ms) ke liye sahi hai. SSD par seek nahi hota.
- **Batching asli jeet hai:** same bytes 1 MB ke tukdon mein 7–17× tez (teen runs; batching ka number run ke saath bahut badalta hai).
  Kafka producer messages ko batch karta hai, aur broker OS page cache mein likhta hai — ye Kafka docs ki baat hai, lab ne
  Kafka nahi chalaya.
- **O_DIRECT ki shart:** Node buffer ki alignment aur WSL host ki caching jaanchi nahi gayi; row "is machine ka direct-I/O raasta" hai.
- **Zero copy (sendfile)** is lab mein nahi naapa. Video sahi hai, par TLS on ho toh zero copy nahi hota (Kafka docs).

## ex3-partitions — kram, chhat, hot key, partition badalna

```
$ npm start -- ex3-partitions
key = user id (hash se partition):   0 of 1,000 users ke events ulte kram mein
koi key nahi (round-robin):          1000 of 1,000 users ke events ulte kram mein

 3 consumers → 3 kaam par, 0 khaali baithe → 300 events/sec
 6 consumers → 6 kaam par, 0 khaali baithe → 600 events/sec
12 consumers → 6 kaam par, 6 khaali baithe → 600 events/sec

partition load: 8.4%  31.7%  24.9%  8.7%  11.7%  14.5%
sabse bhari partition = barabar hisse (16.7%) ka 1.90×. Top user akela: 20.8% events.

75,091 of 1,00,000 keys (75.1%) ki partition badli.
```

- **Kram sirf ek partition ke andar.** Key (user id) se ek user ke saare events ek partition mein. Model maanta hai ki consumer har
  partition ko serially chalata hai; tab kram bachta hai. Parallel handlers, retries ya rebalance ke baad ka purana kaam kram phir
  tod sakte hain. Ek consumer bhi kai partitions ke beech kram nahi lauta sakta.
- **Bina key:** yahan round-robin tulna ke liye chuna; ek dheema consumer kram tod deta hai. Kafka Java producer bina key ke
  "sticky" batching karta hai. Producer retries par kram ke liye idempotent producer (default on) chahiye.
- **Ek group mein consumers ki chhat = partitions.** 12 consumers aur 6 partitions = 6 khaali.
- **Hot key ek partition par hi rehti hai:** Zipf traffic mein ek partition 1.9× bhari. Partitions badhane se hot key nahi bant-ti.
- **Partitions 6 → 8 karne par 75% keys hilti hain** (murmur2 % N). Badlaav ke waqt purani aur nayi partition dono mein ek user ke
  events → kram toot sakta hai. Partitions ki ginti shuru mein soch kar rakho.

## ex4-backpressure — tank bhar gaya, ab kya?

```
$ npm start -- ex4-backpressure
tareeka                                              likhe gaye   "ho gaya" par khoye   user ko error/429   bekaar DB kaam   DLQ mein
drop: queue bhari → "ho gaya" bolkar phenk do         1,35,500            32,300                 0               0         0
block: queue bhari → web thread jagah ka intezaar     1,35,500                 0            32,300               0         0
reject: queue bhari → turant 429 "baad mein"          1,35,500                 0            32,300               0         0
reject + workers autoscale 1,000/sec tak              1,39,271                 0            25,394          57,402     3,135
reject + workers sirf DB ki had (400/sec) tak         1,41,400                 0            26,400               0         0
```

- **Drop** (video ki strategy 1): user ne "ho gaya" dekha aur data gaya. Logs/metrics ke liye theek.
- **Block** (strategy 2): video sahi — async phir se sync. Kafka producer khud block karta hai: buffer (`buffer.memory`, default
  32 MiB) bhara ho toh `send()` `max.block.ms` (default 60 s) tak rukta hai, phir error. Model mein block aur reject ki ginti barabar
  maani gayi; intezaar karte threads ki deadline alag se simulate nahi ki.
- **Reject (429 / 503)** — video mein nahi: utne hi log mana, par har "ho gaya" wala signup pakka, aur user ko pata hai.
- **Autoscale** (strategy 3): video sahi ki bottleneck DB par chala jaata hai. Model mein DB ki had ke paar scale karna kaam **kam**
  karta hai, 57 hazaar bekaar koshishein, aur 3,135 **theek** messages DLQ mein. Kitne DLQ mein jaate hain, retry ki had par tika hai
  (maxReceive 500 par dono rows barabar). Ilaaj: workers ko DB ki had par roko.
- **DLQ = seemit retries ke baad quarantine** + alert + jaanch + redrive. Wajah asthaayi bhi ho sakti hai (DB band tha); theek karke
  wapas bhejo. DLQ overload ki kshamata nahi badhata. Ordered (FIFO) group mein poison message bina DLQ ke group rokta hai;
  maxReceiveCount 5 × visibility 30 s ≈ 150 s (aadarsh hisaab) baad DLQ — par phir baaki events us event ke bina aage badhte hain
  (kram toota). Rokna ya skip karna — faisla soch kar lo (AWS docs bhi is baat par chetaate hain).

## ex5-crash-points — har crash point gino

```
$ npm start -- ex5-crash-points
tareeka                                          har crash point par charges   do workers: double charge
koi idempotency nahi                             ₹200                          2 of 2 kram
check → charge → record (video)                  ₹100, ₹200, ₹100              18 of 20 kram
ek DB transaction: id insert (UNIQUE) + charge   ₹100                          0 of 2 kram
provider ko Idempotency-Key = message id         ₹100                          0 of 2 kram

tareeka                                                                  cases   theek   event khoya   bina user event   event 2 baar
DB save → queue publish                                                      4       3             1                 0              0
queue publish → DB save                                                      4       2             0                 2              0
outbox: ek transaction (user + outbox row) → relay publish → relay "sent"     5       4             0                 0              1
```

- **Video ka idempotency tareeka adhoora:** "check karo → kaam karo → id likho". Charge ke baad aur id likhne se pehle crash = ₹200.
  Do workers ek saath check karein toh 20 mein se 18 kram mein ₹200.
- **Ilaaj:** id ka record aur kaam ek DB transaction mein (UNIQUE constraint), ya bahar ki API ko idempotency key (Stripe ka
  `Idempotency-Key` header). Lab ka provider key hamesha yaad rakhta hai (turant retry ka model). Stripe keys kam se kam 24 ghante
  baad hata sakta hai — din baad redrive par key purani ho chuki ho sakti hai. Isliye apna durable record aur reconciliation bhi
  chahiye. Asli processes + SQLite par: lab 49.
- **Dual write dono kram mein toot'ta hai;** outbox kuch nahi khota. Par relay at-least-once hai: publish ke baad aur "sent" likhne
  se pehle crash = event 2 baar. Consumer phir bhi idempotent chahiye. Asli processes par: lab 44.

## Source ke daave aur sudhaar

| Video kehta hai | Sach / sudhaar | Kahan se |
|---|---|---|
| Task queue: "har image theek ek worker, theek ek baar" | SQS standard at-least-once; crash ya visibility timeout se lamba kaam = duplicate. (SQS FIFO 5 minute ki dedup window deta hai.) Video baad mein khud at-least-once kehta hai | ex1, AWS SQS docs |
| Spike mein email "10 minute" late, koi message nahi khota | 60 s ke spike par ~99 min; worker = normal traffic ho toh backlog kabhi khatam nahi; retention ke baad messages khote hain | ex0, AWS SQS docs |
| Kafka "infinite scroll"; offset 2 hafte peeche le jao | Retention ke andar hi: default `log.retention.hours` = 168 (7 din). Compaction poori history nahi rakhta. Naya group default `latest` se shuru | ex1, Kafka docs |
| Spinning disk bhi sequential mein sau MB/sec; random maarta hai | HDD ke liye sahi. Is SSD par seedha vs random overwrite barabar; batching 7–17× (run ke saath badalta) | ex2 |
| Zero copy (sendfile) | Sahi; par TLS on ho toh zero copy nahi hota | Kafka docs (design, efficiency) |
| LinkedIn roz 7 trillion messages | LinkedIn ne October 2019 mein 7 trillion bataya tha | LinkedIn engineering blog (2019) |
| Kram partition ke andar; user id key se kram pakka | Key kram ka mauka deti hai; consumer ko partition serially chalani hogi (parallel handlers, retries kram todte). Partitions badalne par ~75% keys hilti hain (6 → 8); hot key ek partition par | ex3, Kafka consumer docs |
| Backpressure: drop, block, autoscale | Chautha raasta chhoot gaya: reject (429/503). Kafka producer khud 60 s tak block karta hai | ex4, Kafka producer configs |
| Throughput se zyada load → DLQ | DLQ = seemit retries ke baad quarantine + redrive; kshamata nahi badhata. Overload mein theek messages DLQ mein; FIFO mein skip = kram toota | ex4, AWS SQS DLQ docs |
| Idempotency: check → kaam → id likho | Crash aur do workers ki race mein double charge; ek transaction ya provider idempotency key (Stripe keys 24 ghante baad hat sakti hain) | ex5, lab 49, Stripe docs |
| Outbox dual write ko poori tarah khatam karta hai | Lost/phantom khatam; relay at-least-once, duplicate phir bhi aate hain | ex5, lab 44 |
| Sync rakho agar 100–200 ms mein ho jaaye | Achha anubhav ka niyam (heuristic); kanoon nahi | — |

## Sources

- AWS, *Amazon SQS — at-least-once delivery, visibility timeout, message retention* — https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html
- Apache Kafka documentation (design: persistence, efficiency, zero copy; broker and producer configs) — https://kafka.apache.org/documentation/
- Kafka Java client partitioner (murmur2) — https://github.com/apache/kafka/blob/trunk/clients/src/main/java/org/apache/kafka/common/utils/Utils.java
- Stripe, *Idempotent requests* — https://docs.stripe.com/api/idempotent_requests
- Chris Richardson, *Pattern: Transactional outbox* — https://microservices.io/patterns/data/transactional-outbox.html

## Files

| File | Kya |
|---|---|
| `lib/buffer.js` | ex0 sync vs async, backlog ka hisaab |
| `lib/queue.js`, `lib/log.js` | Task queue (visibility timeout) aur append-only log (offsets, retention) |
| `lib/append.js` | ex2 asli writes (O_DIRECT, page cache) |
| `lib/partition.js` | Kafka murmur2 partitioner, kram ka model |
| `lib/backpressure.js` | ex4 model (overflow, scaling, DLQ) |
| `lib/crash.js` | ex5 crash points aur interleavings |
| `tools/*.js` | Har exercise ka tool |
| `test/core.test.js` | 6 tests |
| `captures/` | Runs (ex2: 3 runs) + `test.txt` |

## Practice

1. ex0 mein worker 11/sec karo. Backlog kab khatam hota hai?
2. ex1 mein visibility timeout 30 s se 60 s karo. Lambi job ab bhi do baar chalti hai?
3. ex3 mein partitions 6 → 12 karo. Kitni keys hilti hain? (Socho: 6 ke multiple par kya hota hai?)
4. ex4 mein DB 400 se 1,000/sec karo. Ab autoscale kya karta hai?
