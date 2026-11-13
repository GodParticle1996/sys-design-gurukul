# 🏛️ System Gurukul

**System design seekho — chalaake.** Hinglish mein, level by level: concepts ko
interactive models aur runnable local labs mein test karo.

Baaki Gurukul apps mein terminal ek *tool* sikhata hai (kubectl, mysql, kafka-topics).
Yahan terminal ek **system ka analytical model chalata hai**. Tum request bhejte ho,
load daalte ho, fault inject karte ho — aur simulated rows examined, p99, pool occupancy
aur replica lag compare karte ho. Local Docker projects alag runnable implementations hain.

```
$ GET /api/v1/transactions?page=485728&limit=50
  rows examined  24,286,400   ← sirf 50 chahiye the
  p99            9.20 s       🔥 SLO (200ms) se 46x zyada

$ GET /api/v1/transactions?cursor=eyJ0Ijo..&limit=50
  rows examined  50
  p99            11 ms        ✅
```

---

## Chalao

Koi build nahi, koi dependency nahi. Bas file kholo:

```bash
xdg-open index.html      # ya browser mein drag karo
xdg-open gallery.html    # concept diagrams ek jagah
node validate.js         # structure + missions + render — sab check
node validate.js pool    # sirf ek level ke missions
node tools/replay-missions.js    # intended solutions + skip/garbage/state regressions
node tools/replay-exercises.js   # har interactive stage + interview, right/wrong actions
node tools/quiz-quality.js --check  # length bias, per-option feedback, shuffled positions
node tools/tradeoff-test.js      # metric contracts, demand-reduction shortcuts, invalid states
node dev/state-test.js           # old/corrupt/blocked storage and reload migration
node dev/progress-test.js        # restart/reload XP farming and single-use review guards
node dev/xp-test.js              # XP, first-try and rank regression
node dev/concurrency-test.js     # real Java output vs captures, lesson text and renderers (JDK 21+)
```

---

## Kya hai isme

**15 tracks · 299 levels · 1257 stages · 613 interview Qs · 1238 flashcards · 299 diagrams · 506 interactive labs · 58 lab projects**
(ginti `node validate.js` se, 2026-11-13)

| Track | Levels | Kya seekhoge |
|---|---|---|
| 🧵 **Concurrency — khud todo, phir sambhalo** (hamesha khula, free order) | 7 | **20 concepts**: process/thread aur lifecycle se races, mutex, semaphore, conditions, lock scope, deadlock/livelock/starvation, atomicity, immutability aur concurrent idempotency tak. **Paanch Java build–break–fix labs**: race · producer–consumer · semaphore pool · deadlock · bounded thread pool. [Coverage aur commands](docker-labs/46-concurrency/README.md). |
| 🧪 **First Principles — machine se system tak** (hamesha khula, free order) | 32 | Alag 15-video course ke pehle aath topic: **Physics of Software** — remote lookup ka wait · batching vs bounded parallelism · latency/bandwidth aur units · waiting vs service · Little's Law ke averages · warm file-read benchmark ki hadd · hot data aur cost ka hisaab. **Math of Scale** — ausat vs percentiles · fan-out par tail (independent vs shared dheemapan) · load ka knee 1 ÷ (1 − load) · saturation · Amdahl asli threads par · hedged requests ki shartein (budget, cancel, bhaari request). **Cost of Communication** — ek call ka bill (handshakes × RTT) · chatty vs chunky · connection reuse asli connections par · pooling vs multiplexing · JSON vs Protobuf (bytes, gzip, CPU) · varint aur decoder ki seema · chhote writes · doori aur CDN edge. **Anatomy of a Request** — packet aur headers · asli UDP DNS chain aur TTL cache · packet loss se p99.9 · TTL ka sauda aur geo DNS · BGP policy, anycast aur leak · edge par TLS · WAF rules × bytes · L4 vs L7 · gateway vs service authorization. **Physics of Persistence** — write() vs fsync aur page cache · app crash vs power cut · group commit · WAL, checkpoint aur recovery · aadha record vs beech ki kharabi · checksum aur replica · B-tree oonchai aur page writes · LSM compaction aur bloom filter · SSD write amplification · pakkapan ki seedhi. **Taxonomy of Storage** — ek address ki chhe copies aur crash · teen shapes (tables / JSON docs / key-value) par do sawaal · join index ke saath vs bina (10 lakh users) · friend-of-friend SQL vs graph walk · schema on read ke chup readers aur migration · vector exact vs IVF · NewSQL commit ka intezaar. **Sharding** — mahine se range shard aur aaj ka garam shard · hash ki keemat (range sawaal sab shards par) · ek disk par fsync · `hash % N` vs ring (N/(N+1) keys hilti hain) · viral vote key ko todna (takraav, k reads) · Snowflake ke bits, ghadi peeche aur duplicates · UUIDv4 vs UUIDv7 B-tree par · co-location, cross-shard transfer crash · backfill race, tombstone aur sample check ki hadd. **CAP & PACELC** — 3 \| 2 split mein ATM par CP vs AP (LWW, ledger, offline seema) · atka node vs mara node aur timeout · async / sync-any-1 / sync-all ki latency aur crash par nuksaan · read-your-writes, monotonic reads, causal ke ilaaj · LWW vs version vectors vs CRDT (G-Counter, OR-Set) · split brain, quorum aur fencing token. [Numbered 1→15 roadmap](dev/first-principles-plan.md); abhi aath topic bane hain. |
| 📣 **Playlist · 2 EDA Core — ek ghatna, alag kaam** (hamesha khula, free order) | 24 | Pehla topic: **Event-Driven Architecture** — notification se atka order · har consumer ki apni copy · asli publish/read/ack code · Node EventEmitter ka farak · accepted vs completed · duplicates, RAM broker restart aur save/publish gap. Doosra topic: **Event Payloads** (lab 47) — patli khabar par owner reads aur owner-down · moti khabar ki local copy · version check · delta gap + resync · bytes aur nazuk data ka failaav. Teesra topic: **EDA Tradeoffs** (lab 48) — burst mein line vs reject · roz ka zyada load (line kabhi khaali nahi) · band consumer, retention aur dead-letter (SQS/RabbitMQ ke asli niyam) · sync chain vs events asli HTTP par (pending, failure ki khabar). Chautha topic: **EDA Races** (lab 49, asli processes + SQLite) — competing consumers ka ulta kram (key routing, buffer + gap) · do writers ka khoya update (CAS, atomic) · ack se pehle crash ka dohra charge aur sahi idempotency key. Paanchvaan topic: **Event Sourcing** (lab 50, asli processes + SQLite) — slate vs passbook (fold, kisi bhi pal ki haalat) · version ki shart bina minus balance · store + publish ka crash vs catch-up projector aur checkpoint · snapshot, upcasting, read-your-writes · kab lagana, kab nahi (GDPR, versioning). Chhatha topic: **Event Modeling** (lab 51) — field-field ke events se mila-jula address · BalanceUpdated vs asli ghatna · "ek aur field" ke raaste (bytes, teams, kram) · strict vs tolerant consumer par schema badlaav (expand/contract). Agle topics ka [plan](dev/eda-plan.md). |
| 🛡️ **Playlist · 1 Resilience — samasya se code tak** (hamesha khula, free order) | 38 | System design playlist ka pehla hissa, har topic chaar sawaalon mein — **Kyun** (samasya, slow motion mein) · **Kaise** (ek-ek click) · **Code** (asli code + asli library) · **Kab**: **Circuit Breaker · Retries · Backpressure · Noisy Neighbour · Randomness · Health Checks · Disaster Recovery · Chaos Engineering** |
| 🧭 **Foundations — Request ka Safar** | 10 | Ek request ke saare hops, **networking (TCP/UDP, HTTP 1.1→3, L4 vs L7)**, latency & percentiles, **numbers to know**, back-of-envelope estimation, sync vs async, fan-out ka tail tax, service decomposition |
| 🔌 **API Design & Contracts** | 11 | Resource naming, verbs & status codes, **deep offset ka katl**, **cursor pagination**, bounded query surface, versioning, **auth & identity (IDOR, 401 vs 403, JWT vs session)**, error contracts, idempotency keys, rate limiting |
| 🗄️ **Data & Storage** | 18 | Access-pattern-first modeling, B-tree, composite & covering index, index types, N+1, **connection pool & Little's Law**, caching, stampede, **cache invalidation**, **eviction policies & hot keys**, **unique IDs at scale**, storage choice, **B-tree vs LSM**, **bloom filters & HLL**, sharding, **consistent hashing**, **zero-downtime migrations** |
| 🛡️ **Scale & Resilience** | 16 | Timeouts, retries + jitter, circuit breaker, bulkhead, DLQ, graceful degradation, load shedding, **backpressure**, **blast radius & cells (shuffle sharding)**, **replication (active-active vs active-passive)**, **replica ≠ backup**, **flash crowd**, observability, SLO & error budget, **chaos engineering** |
| 🌐 **Distributed & Consistency** | 16 | CAP/PACELC, eventual consistency ka UX, **clock skew & fencing tokens**, DB per service, cross-service queries, **saga**, **outbox**, exactly-once ka jhooth, **streams (queue vs log, watermarks)**, **Raft consensus (leader election, quorum, split vote)**, **distributed scheduling (leases, zombie workers)**, locks, **lock kaunsa chunein**, **contention & reservations (OCC vs PCC)** |
| 🧩 **Patterns & System Shapes** | 11 | **12 shapes ka classification**, search & inverted index, media upload, realtime fanout, geo & hot cells, ledger & reconciliation, **anti-patterns aur unki keemat**, **technology chooser**, coffee shop, design review |
| 🏗️ **Poore Systems Banao** | 9 | Khaali page se: **URL shortener · leaderboard · ad click aggregator · ticket booking · chat · video platform · file storage & sync · web crawler** — Final Boss: **Uber** |
| 📡 **The Feed — Asli Posts, Asli Outages** | 19 | **Public postmortems**: Cloudflare 2025 (config-as-input) · Cloudflare 2019 (regex + global deploy) · GitHub 2018 (split brain) · AWS Kinesis 2020 (O(N²) threads) · Roblox 2021 (death spiral) · **CrowdStrike 2024** (21 maange, 20 mile; boot loop) · **Datadog 2023** (40,000 servers ek minute mein). Plus **napkin math**, **vector search / RAG**, **multi-region**, **progressive rollout**, **cost per request** |
| 🏢 **Real Company Stories** | 44 | 14 companies ki asli kahaani (Reddit se Notion tak; neeche pehli 8 ki jhalak), har ek 2–4 levels: **Reddit** (facts ≠ answers, rank, cache, strangler) · **Cloudflare** (anycast, fleet, DDoS defense, edge) · **Jira** (tenant isolation, index, query) · **Snowflake** (storage/compute split, warehouses) · **Airtable** (in-memory, live queries, Rust rewrite) · **Slack** (boot, fan-out, sharding, queue) · **Discord** (data model, hot partitions, 3 arab messages ka migration) · **Instagram** (Postgres par scale). Zyaadatar stories ke saath ek **Node docker project** hai (`docker-labs/01…07`, 13, 14, 16, 25, 27, 31) |
| 🤖 **AI Companies — Model ke peeche ka system** | 20 | AI ka asli kaam model ke bahar: agent ko band rakhna, muft GPU ka bantwara, 3 swipe mein pehchaan, Replit Agent ka "undo", patli wire par training, AWS ka capex |
| 🌍 **Planet-scale Infra — Poori duniya ke liye** | 24 | BitTorrent · Starlink · YouTube · Gmail · Google Search · Google Maps — har ek mein physics, numbers aur ek ulta-seedha faisla |

Core tracks mein **BOSS** levels hain; playlist topics ka apna interview round hai.
Har track ka apna certificate hai.

### 🐳 Docker projects — `docker-labs/`

58 chhote lab projects (poori list `docker-labs/README.md` mein): 57 **Node.js (zero dependency)** services aur tools; **Concurrency lab (46) Java 21** platform threads use karta hai. Services aur tools failure khud
dikhate hain — Reddit ka cache, Cloudflare ka edge filter, Jira ka noisy neighbour, Snowflake ka warehouse, Airtable ki
live query, Slack ka boot/fan-out/queue, Discord ki hot partition, **job scheduler (lease + zombie + idempotency)**,
**Raft (election, split vote, quorum)**, **50 TB migration (dual write vs CDC vs shadow)**. Har README mein asli run ke
numbers. Level ke andar ka 🐳 stage batata hai kya chalana hai aur output par sawaal poochta hai.

```bash
cd docker-labs/09-raft
docker compose --profile ex1-election up --build     # ya bina docker (Node 18+): npm start ex1-election
```

Database ke andar wala hissa (WAL, MVCC, partitioning, CDC) **SQL Gurukul** ke 🔬 Database Internals track mein hai.

### 📡 The Feed — naya content yahan aata hai

`feed` track ka naam iske **source** par hai: jo feed par aata hai (public
postmortems, engineering blogs, LinkedIn posts, newsletters) woh yahan level
banta hai. Naya post aaye toh "Feed mein naya content daalo" — sirf ek naya
level `data-feed.js` mein, uska diagram `visuals.js` mein, aur `node validate.js`.

Yeh track **hamesha unlocked** hai (`alwaysUnlocked: true`) — kyunki naya content
kabhi bhi aa sakta hai, aur uske liye pichhla track poora karne ka intezaar nahi
karna chahiye.

---

## 🎛️ Interactive labs — `labs.js`

`perfsim` (terminal) aur `canvas` (design) ke alawa `labs.js` mein chaar aur renderer hain. (Playlist courses ke `dryrun`/`cards` `explain.js` mein hain, 🐳 `docker` stage `dockerlab.js` mein.)
Sab `SD.renderers.<type>` mein register hote hain, aur sabka contract wahi hai:
`(stage, arena, onDone) → onDone({ firstTry, total })`.

| Lab | Kya karta hai | Kahan |
|---|---|---|
| 🔥 `replay` | Asli outage ki timeline scrub karo. Har frame par metrics badalte hain; kuch frames par replay **rukta** hai aur poochta hai "ab kya karoge" — jawab ke bina aage nahi badhta | 12 levels: Feed ke 6 postmortems + boss, `consensus-split`, `scheduling`, Jira index, Slack queue, AI incident |
| ⚖️ `tradeoff` | Knob ghumao, number **live compute** hota hai. Recall/latency/RAM, write/read/availability, samples/blast-radius — sab formulas se, hardcode nahi | 32 levels: 20 company stories, Feed (vectors · multiregion · rollout · pm-regex), `contention`, `blast`, `migrations` … |
| 🧮 `estimate` | Pehle **tumhara** andaaza (5k, 2.5M, 1.2 crore — sab parse hote hain), phir asli calculation step-by-step. Sahi ka matlab **sahi order of magnitude** | 22 levels: napkin · unitcost · pm-thread, 9 company stories, AI aur Planet tracks |
| 🕵️ `archdiff` | Har component ko explicitly flawed ya safe classify karo; dono choices ka reason dikhta hai | 13 levels: pm-config · pm-spiral · pm-datadog-fixes · unitcost · boss-feed · blast, 5 stories, 2 AI |

Validator in labs ko sirf padhta nahi — **render karke chalata** hai:
tradeoff ka poora knob sweep (koi bhi combination goal poora karta hai?),
replay/estimate/archdiff ko poora **jeet kar dikhata** hai (softlock guard), aur
yeh bhi check karta hai ki goal **shuru mein hi poora na ho**.

---

## 🧰 perfsim — is app ka dil

`perfsim.js` ek asli cost & load simulator hai. Numbers **compute** hote hain,
hardcode nahi — isliye tumhare har experiment ka jawab sach mein badalta hai.

```
REQUESTS
  GET /api/v1/transactions?page=1&limit=50        offset paging
  GET /api/v1/transactions?cursor=<tok>&limit=50  keyset paging
  POST /v1/payments -H 'Idempotency-Key: abc'     write
  GET /health                                     health check (aur uska jhooth)
  ... -n 30                                       same request 30 baar

DATABASE
  show tables · show indexes on t · EXPLAIN SELECT ...
  CREATE INDEX ix ON transactions(user_id, created_at)

SYSTEM
  sim status | set <path> <val> | scale | precompute | reset
  sim add cache|timeout|retry|breaker|fallback|admission|ratelimit|bulkhead|dlq
  sim inject latency|down|error|long-tx|flash
  sim set api.auth header|body      identity token se ya (spoofable) request se
  sim set db.engine lsm|postgres    sim set booking.mode optimistic|pessimistic|reservation

NETWORK
  net trace [--protocol h1|h2|h3] [--warm] [--rtt 40]
  net compare --assets 60           net lb l4 | l7

HASH RING
  ring show    ring set vnodes 150    ring add node-5    ring remove node-2

IDs · PROBABILISTIC
  id gen uuid4|ulid|snowflake|autoinc --n 5     id bench --type uuid4 --rows 1000000
  bloom --items 1000000 --fp 0.01               hll --items 100000000

STREAMS · CONTENTION
  stream window --size 60 --watermark 10        stream replay --from 0
  stream partitions --partitions 6 --consumers 8
  book seat A1 --concurrent 2                   book hold A1 --ttl 600

CACHE LAB
  cache sim --policy lru|lfu|fifo --size 3 --keys 'a b a b c d'
  cache hotkey --key post:celeb42 --rps 50000 --replicas 8
  cache coalesce --misses 5000 --on

MIGRATION LAB
  migrate status | dual-write on | backfill --batch 5000 | verify | cutover | rollback

STORAGE ENGINE
  bench write --rows 100000 · bench read --rows 100000 · bench compact

OBSERVABILITY
  load --rps 500 --duration 8 --pattern deep-page
  load --rps 500 --path '/api/v1/orders?page=2&limit=50'
  trace <request> · metrics · slo · estimate · cursor decode
```

### Cost model

| Cheez | Kaise nikalta hai |
|---|---|
| Query cost | left-most prefix index matching, covering detect, buffer-pool hit rate, `COUNT(*)` alag se |
| Capacity | **Little's Law** — `pool_size × (1000 / service_ms)` |
| Pool wait | ρ < 1 par M/M/c approximation, ρ ≥ 1 par backlog growth |
| Retry storm | error rate se amplification (jitter ho toh nahi) |
| Breaker | asli state machine — CLOSED → OPEN → HALF-OPEN, khud trip hoti hai |

Yeh deterministic teaching-model examples hain; production benchmarks nahi:

1. **Deep pagination** — bina index 12.8 s → index ke saath page 1 par 8 ms → **wahi index**, page 485728 par 6.8 s → cursor par 8 ms
2. **Pool exhaustion** — 15 ms asli kaam, 1.01 s `pool.acquire()`, CPU 10%, health green
3. **Resilience** — down dependency par 30 s → timeout 500 ms → retry ne **badha** ke 2.7 s → breaker + fallback par 9 ms
4. **Cache policy** — ek hi access pattern par FIFO 33% · LRU 33% · **LFU 50%** (scan hot keys ko nikaal nahi paata)
5. **Storage engine** — 1 lakh writes: B-tree 8.5 s → LSM 1.2 s; par reads 2.1 s → **5.5 s**, aur compaction ka bill alag
6. **Migration** — galat kram par **41,204 rows chup-chaap gayab**; `verify` unhe pakadta hai, `rollback` bachaata hai
7. **Consistent hashing** — node add karne par ring **17.5%** keys hilata hai vs `hash % N` ka **80%**; aur 150 vnodes se skew **1.89x → 1.01x**
8. **Unique IDs** — 10 lakh inserts: UUIDv4 **43 s / 340k page splits** vs Snowflake **6 s / 2k**
9. **Networking** — cold connection ka setup tax **110 ms** (TLS 1.3; purane TLS 1.2 par 150 ms), warm par **0**; 60 assets par HTTP/1.1 630 ms → /2 192 ms → /3 152 ms
10. **Approximation** — bloom **1.1 MB** vs exact set 22.9 MB; HLL **12 KB** vs 1.5 GB

---

## 🏗️ Design canvas

Doosra renderer: `canvas.js`. Ek scenario + requirements milte hain, tum har slot par
ek decision chunte ho, phir **design review** hota hai — aur usme **saare** options ke
tradeoff khulte hain, sirf tumhare chune hue ke nahi. Asli seekh wahi hai.

---

## 📁 Files

```
index.html · gallery.html · style.css

core.js        state, XP, streak, spaced repetition (SD namespace), level registry
data-core.js   ranks, core tracks, aur SD.sys.* system presets
games.js       quiz · bins · order · match · fill · hotspot · incident
perfsim.js     cost & load simulator + SD.renderers.terminal
canvas.js      SD.renderers.design (design canvas)
labs.js        replay · tradeoff · estimate · archdiff   (IIFE-wrapped!)
dockerlab.js   SD.renderers.docker — docker-labs/ project ka stage (IIFE)
explain.js     SD.viz.svg (chhota SVG diagram) + SD.renderers.dryrun / cards — ek click = ek badlaav (IIFE)
visuals.js     core concept diagrams; baaki content files apne diagrams register karti hain
app.js         screens & flow

data-flow.js · data-api.js · data-data.js · data-resil.js
data-dist.js · data-shapes.js · data-builds.js · data-feed.js
data-st-01-reddit.js … data-st-14-notion.js   🏢 Real Company Stories
data-gaps.js   maujooda tracks ke BEECH ke levels
data-ext-videos.js   purane levels ko SD.extendLevel se badhaya + Raft levels (data-gaps ke BAAD)
data-ext-episodes.js · data-ext-sdd1.js   video batches: purane levels badhaye + naye levels (videos ke BAAD, isi kram mein)
data-v2-00-tracks.js · data-v2-<topic>-<n>-<hissa>.js   🛡️ playlist course: ek level ek file (EXTENDING.md §10.7)
docker-labs/   46 projects: 45 Node + 1 Java concurrency lab (compose + start.js + README captures)
data-guidance.js  59 topic guides; data-v2-concurrency.js adds 7 guides (all 275 levels assigned)
exercise-solutions.json  nonterminal exercises ke intended actions
validate.js    structure + missions + labs + render
```

Naya content? Sirf `data-*.js` aur `visuals.js` chhuo. Details:
[EXTENDING.md](EXTENDING.md).

---

## 🧪 validate.js

```
🔎 STRUCTURE  level/stage ki shakl · unsolvable fill · softlock hotspot ·
              toote incident branches · gayab VISUALS · boss-last · script tags ·
              non-Latin script leak (Cyrillic/Devanagari jo typing mein ghus jaata hai)
🧪 MISSIONS   explicit solution commands ko ASLI perfsim par replay karta hai;
              fresh/partial/omitted steps win nahi karte; final step par live
              verify + success + poora checklist true hona chahiye
🖼️ RENDER     app.js ko boot karke har level ka intro render karta hai —
              `undefined` HTML aur render-time crashes pakadta hai
```

Interactive solutions `exercise-solutions.json` mein static actions hain. Node replays
aur `node dev/replay-browser.js` actual Chromium mein wahi fixtures chalate hain,
wrong options, repeated clicks, missing decisions aur preview shortcuts bhi try karte hain.
Browser tools existing Playwright/Chromium use karte hain; install ya server start nahi karte.

`data-guidance.js` ke 59 guides aur `data-v2-concurrency.js` ke 7 guides all 275 levels ko explicit map karte hain:
why → tiny example → hands-on → use/avoid → comparison → decision tree → common mistake/production.
Theme Light/Dark topbar se badalti hai. Tap controls Enter/Space se bhi chalte hain.
Progress v1 storage se migrate hoti hai; resume challenge boundary par hai, partial
answers ya simulator ke beech ka state persist nahi hota. XP first full level completion
par award hota hai; boundary par saved pending XP resume ke saath aata hai. Completed
level replays extra XP nahi dete; pop-quiz question bonus ek din mein ek baar milta hai.
Browser storage blocked
ho toh current tab chalta hai aur saving limitation dikhti hai.
Resume checkpoint poore stage payload ka fingerprint check karta hai; changed questions
ya predicates ke baad stale checkpoint discard hota hai.

🐳 Docker stage observation sawaal se poora hota hai — lab chalao ya na chalao (laptop ke bina har step ka
captured output khul jaata hai). Har step ✔ karne par lab "ho gaya" maana jaata hai; jo lab baaki hai uska
🐳 nishaan level map par dikhta hai, aur level intro se woh lab seedha khul jaata hai. Browser steps ya
output verify nahi karta — yeh learner ki apni report hai. Simulated costs, timings, quotas aur historical company snapshots current
provider guarantees nahi. Source review aur validation evidence [dev/AUDIT.md](dev/AUDIT.md) mein hai.

---

## 🎓 Poore app ka nichod

1. Har request ka **raasta** jaano — aur jaano kaunsa hop **queue** banata hai
2. API ki cost **bounded** rakho — mehenga sawaal poochhne hi mat do
3. Pehle **access pattern**, phir schema aur index — aur har kadam par **naapo**
4. Har remote call ek din fail hogi: **timeout · jitter · breaker · fallback · bulkhead · shed**
5. Distributed system mein "ek saath" nahi hota, sirf "aakhir mein" — isliye sab kuch
   **idempotent, retryable, observable**
6. Boxes banane se pehle problem ka **naam** lo — naam ke saath uska known failure mode
   aata hai, aur wahi agla sawaal hai
7. Har pattern ki **keemat** bolo. Keemat na bata sako toh tumne use samjha nahi —
   bas uska naam seekha hai
8. Aur aakhir mein: **padhna alag hai, banana alag.** Builds track mein
   systems ko requirements se design karo.
