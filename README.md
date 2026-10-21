# 🏛️ System Gurukul

**System design seekho — chalaake.** Hinglish mein, level by level, aur har daava
terminal mein **prove** hota hai.

Baaki Gurukul apps mein terminal ek *tool* sikhata hai (kubectl, mysql, kafka-topics).
Yahan terminal ek **poora system chalata hai**. Tum request bhejte ho, load daalte ho,
fault inject karte ho — aur simulator batata hai ki kitni rows padhi gayi, p99 kya hua,
pool kitna bhara, aur replica kitna peeche hai.

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
xdg-open gallery.html    # saare 94 concept diagrams ek jagah
node validate.js         # structure + missions + render — sab check
node validate.js pool    # sirf ek level ke missions
```

---

## Kya hai isme

**14 tracks · 244 levels · 1016 stages · 503 interview Qs · 1067 flashcards · 244 diagrams · 330 interactive labs · 45 docker projects**
(ginti `node validate.js` ki aakhri line se, 2026-10-20)

| Track | Levels | Kya seekhoge |
|---|---|---|
| 🧪 **First Principles — machine se system tak** (hamesha khula, free order) | 4 | Alag 15-video course ka pehla topic: **Physics of Software** — remote lookup ka wait · batching vs bounded parallelism · latency/bandwidth aur units · waiting vs service · Little's Law ke averages · warm file-read benchmark ki hadd · hot data aur cost ka hisaab. [Numbered 1→15 roadmap](dev/first-principles-plan.md); abhi sirf pehla topic bana hai. |
| 📣 **Playlist · 2 EDA Core — ek ghatna, alag kaam** (hamesha khula, free order) | 4 | Pehla topic: **Event-Driven Architecture** — notification se atka order · har consumer ki apni copy · asli publish/read/ack code · Node EventEmitter ka farak · accepted vs completed · duplicates, RAM broker restart aur save/publish gap. Agle topics ka [plan](dev/eda-plan.md). |
| 🛡️ **Playlist · 1 Resilience — samasya se code tak** (hamesha khula, free order) | 38 | System design playlist ka pehla hissa, har topic chaar sawaalon mein — **Kyun** (samasya, slow motion mein) · **Kaise** (ek-ek click) · **Code** (asli code + asli library) · **Kab**: **Circuit Breaker · Retries · Backpressure · Noisy Neighbour · Randomness · Health Checks · Disaster Recovery · Chaos Engineering** |
| 🧭 **Foundations — Request ka Safar** | 10 | Ek request ke saare hops, **networking (TCP/UDP, HTTP 1.1→3, L4 vs L7)**, latency & percentiles, **numbers to know**, back-of-envelope estimation, sync vs async, fan-out ka tail tax, service decomposition |
| 🔌 **API Design & Contracts** | 11 | Resource naming, verbs & status codes, **deep offset ka katl**, **cursor pagination**, bounded query surface, versioning, **auth & identity (IDOR, 401 vs 403, JWT vs session)**, error contracts, idempotency keys, rate limiting |
| 🗄️ **Data & Storage** | 18 | Access-pattern-first modeling, B-tree, composite & covering index, index types, N+1, **connection pool & Little's Law**, caching, stampede, **eviction policies & hot keys**, **unique IDs at scale**, storage choice, **B-tree vs LSM**, **bloom filters & HLL**, sharding, **consistent hashing**, **zero-downtime migrations** |
| 🛡️ **Scale & Resilience** | 16 | Timeouts, retries + jitter, circuit breaker, bulkhead, DLQ, graceful degradation, load shedding, **blast radius & cells (shuffle sharding)**, **flash crowd**, observability, SLO & error budget |
| 🌐 **Distributed & Consistency** | 16 | CAP/PACELC, eventual consistency ka UX, **clock skew & fencing tokens**, DB per service, cross-service queries, **saga**, **outbox**, exactly-once ka jhooth, **streams (queue vs log, watermarks)**, **Raft consensus (leader election, quorum, split vote)**, **distributed scheduling (leases, zombie workers)**, locks, **contention & reservations (OCC vs PCC)** |
| 🧩 **Patterns & System Shapes** | 11 | **12 shapes ka classification**, search & inverted index, media upload, realtime fanout, geo & hot cells, ledger & reconciliation, **anti-patterns aur unki keemat**, **technology chooser**, coffee shop, design review |
| 🏗️ **Poore Systems Banao** | 9 | Khaali page se: **URL shortener · leaderboard · ad click aggregator · ticket booking · chat · video platform · file storage & sync · web crawler** — Final Boss: **Uber** |

| 📡 **The Feed — Asli Posts, Asli Outages** | 19 | **Public postmortems**: Cloudflare 2025 (config-as-input) · Cloudflare 2019 (regex + global deploy) · GitHub 2018 (split brain) · AWS Kinesis 2020 (O(N²) threads) · Roblox 2021 (death spiral). Plus **napkin math**, **vector search / RAG**, **multi-region**, **progressive rollout**, **cost per request** |
| 🏢 **Real Company Stories** | 44 | 14 companies ki asli kahaani (Reddit se Notion tak; neeche pehli 8 ki jhalak), har ek 2–4 levels: **Reddit** (facts ≠ answers, rank, cache, strangler) · **Cloudflare** (anycast, fleet, DDoS defense, edge) · **Jira** (tenant isolation, index, query) · **Snowflake** (storage/compute split, warehouses) · **Airtable** (in-memory, live queries, Rust rewrite) · **Slack** (boot, fan-out, sharding, queue) · **Discord** (data model, hot partitions, 3 arab messages ka migration) · **Instagram** (Postgres par scale). Har story ke saath ek **Node docker project** (`docker-labs/01…07`) |
| 🤖 **AI Companies — Model ke peeche ka system** | 20 | AI ka asli kaam model ke bahar: agent ko band rakhna, muft GPU ka bantwara, 3 swipe mein pehchaan, Replit Agent ka "undo", patli wire par training, AWS ka capex |
| 🌍 **Planet-scale Infra — Poori duniya ke liye** | 24 | BitTorrent · Starlink · YouTube · Gmail · Google Search · Google Maps — har ek mein physics, numbers aur ek ulta-seedha faisla |

Har track ke aakhir mein ek **BOSS** level hai, aur har track ka apna certificate.

### 🐳 Docker projects — `docker-labs/`

45 chhote **Node.js (zero dependency)** projects (poori list `docker-labs/README.md` mein): har ek mein asli services (HTTP servers) aur tools jo failure khud
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

`perfsim` (terminal) aur `canvas` (design) ke alawa chaar aur renderer hain.
Sab `SD.renderers.<type>` mein register hote hain, aur sabka contract wahi hai:
`(stage, arena, onDone) → onDone({ firstTry, total })`.

| Lab | Kya karta hai | Kahan |
|---|---|---|
| 🔥 `replay` | Asli outage ki timeline scrub karo. Har frame par metrics badalte hain; kuch frames par replay **rukta** hai aur poochta hai "ab kya karoge" — jawab ke bina aage nahi badhta | saare 5 postmortem levels + boss |
| ⚖️ `tradeoff` | Knob ghumao, number **live compute** hota hai. Recall/latency/RAM, write/read/availability, samples/blast-radius — sab formulas se, hardcode nahi | vectors · multiregion · rollout · blast · pm-regex |
| 🧮 `estimate` | Pehle **tumhara** andaaza (5k, 2.5M, 1.2 crore — sab parse hote hain), phir asli calculation step-by-step. Sahi ka matlab **sahi order of magnitude** | napkin · unitcost · pm-thread |
| 🕵️ `archdiff` | Ek design jisme flaws chhupe hain. Click karke pakdo — aur **sahi** box par click bhi apni wajah batata hai | pm-config · pm-spiral · blast · unitcost · boss |

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

Isliye teen sabse zaroori demos sach mein chalte hain:

1. **Deep pagination** — bina index 12.8 s → index ke saath page 1 par 8 ms → **wahi index**, page 485728 par 6.8 s → cursor par 8 ms
2. **Pool exhaustion** — 15 ms asli kaam, 1.01 s `pool.acquire()`, CPU 10%, health green
3. **Resilience** — down dependency par 30 s → timeout 500 ms → retry ne **badha** ke 2.7 s → breaker + fallback par 9 ms
4. **Cache policy** — ek hi access pattern par FIFO 33% · LRU 33% · **LFU 50%** (scan hot keys ko nikaal nahi paata)
5. **Storage engine** — 1 lakh writes: B-tree 8.5 s → LSM 1.2 s; par reads 2.1 s → **5.5 s**, aur compaction ka bill alag
6. **Migration** — galat kram par **41,204 rows chup-chaap gayab**; `verify` unhe pakadta hai, `rollback` bachaata hai
7. **Consistent hashing** — node add karne par ring **17.5%** keys hilata hai vs `hash % N` ka **80%**; aur 150 vnodes se skew **1.89x → 1.01x**
8. **Unique IDs** — 10 lakh inserts: UUIDv4 **43 s / 340k page splits** vs Snowflake **6 s / 2k**
9. **Networking** — cold connection ka setup tax **150 ms**, warm par **0**; 60 assets par HTTP/1.1 670 ms → /2 232 ms → /3 152 ms
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
data-core.js   ranks, 8 tracks, aur SD.sys.* system presets
games.js       quiz · bins · order · match · fill · hotspot · incident
perfsim.js     cost & load simulator + SD.renderers.terminal
canvas.js      SD.renderers.design (design canvas)
labs.js        replay · tradeoff · estimate · archdiff   (IIFE-wrapped!)
dockerlab.js   SD.renderers.docker — docker-labs/ project ka stage (IIFE)
explain.js     SD.viz.svg (chhota SVG diagram) + SD.renderers.dryrun / cards — ek click = ek badlaav (IIFE)
visuals.js     94 concept diagrams (append-safe: har ek alag assignment)
app.js         screens & flow

data-flow.js · data-api.js · data-data.js · data-resil.js
data-dist.js · data-shapes.js · data-builds.js · data-feed.js
data-st-01-reddit.js … data-st-08-instagram.js   🏢 Real Company Stories
data-gaps.js   maujooda tracks ke BEECH ke levels
data-ext-videos.js   purane levels ko SD.extendLevel se badhaya + Raft levels (data-gaps ke BAAD)
data-ext-episodes.js · data-ext-sdd1.js   video batches: purane levels badhaye + naye levels (videos ke BAAD, isi kram mein)
data-v2-00-tracks.js · data-v2-<topic>-<n>-<hissa>.js   🛡️ playlist course: ek level ek file (EXTENDING.md §10.7)
docker-labs/   43 Node projects (compose + start.js + README numbers ke saath)
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
🧪 MISSIONS   har terminal mission ke HINTS ko ASLI perfsim par chala ke dekhta hai
              ki tasks poore hote hain aur success() true hota hai — aur fresh sim
              par success() FALSE hai (warna mission apne aap complete ho jaayega)
🖼️ RENDER     app.js ko boot karke har level ka intro render karta hai —
              `undefined` HTML aur render-time crashes pakadta hai
```

**2405 checks · 0 error · 0 warning.**

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
8. Aur aakhir mein: **padhna alag hai, banana alag.** Isliye aakhri track mein
   saat asli systems hain — khaali page se.
