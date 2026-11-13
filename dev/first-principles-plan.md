# First Principles — playlist coverage

User chose a **separate First Principles course, starting at video 1** on 2026-10-20.
Source: [System Design from First Principal — FAANG Senior Engineer](https://www.youtube.com/playlist?list=PLA12lriZjwUOHcm2HHO3OQznvfZOBjRzn).
Video-Translate returned 15 public entries. The playlist is reverse chronological: numbered lesson 15 appears first.
Teach numbered order 1 → 15. Track stable video IDs, not playlist positions.

## Ordered inventory and overlap

| # | Source title | Video ID | Existing material to inspect before building |
|---|---|---|---|
| 1 | The Physics of Software | `dDOKu20juEc` | Foundations latency, `napkin`, connection pooling; new lab 45 |
| 2 | Master the Math of Scale | `04ip8kPZXsM` | `data-flow.js`, `data-feed.js` napkin/estimate |
| 3 | The Cost of Communication | `YOR9hAFoe2o` | Network, fanout, lab 41 |
| 4 | The Anatomy of a Request (DNS, BGP, and the Edge) | `kt1tW0El6Gg` | Request lifecycle, Cloudflare track |
| 5 | The Physics of Persistence (B-Trees vs LSM-Trees) | `RAuIWs3ne9g` | Data/storage, SQL Gurukul internals |
| 6 | The Taxonomy of Storage | `mhpinZnH7xI` | Storage chooser; exact source not read yet |
| 7 | Sharding — When One Disk is Not Enough | `X72epD9Qn3U` | Sharding, consistent hashing, lab 34 |
| 8 | CAP Theorem & PACELC | `Ub9yZucpwC0` | Distributed/Consistency |
| 9 | Distributed Consensus & Raft | `xU-7JxwUpLo` | Consensus, lab 09 |
| 10 | Caching | `t9jtxlu7k4k` | Cache/eviction/stampede, labs 01, 33 |
| 11 | Kafka vs RabbitMQ vs SQS — Async System | `mQf7RtBuiaY` | Streams, outbox, EDA lab 44 |
| 12 | Mathematics of the Second Attempt | `s5HWkMyRRcA` | Retries 5-level topic, lab 37 |
| 13 | Microservices — Know When NOT to Use | `cmiAEDVcGbE` | Decomposition, Prime Video lab 16 |
| 14 | Observability — How to Not Fly Blind | `jwVEgkBDyM8` | Observability, health/chaos labs 42–43 |
| 15 | How to Build Instagram from Scratch | `ozWW5nIdzQM` | Instagram company story + full-system builds |

This table is a title-based roadmap, not a claim that the remaining videos were watched or converted.
Reuse lab evidence where it fits; write a self-contained course rather than copying old screens blindly.
The Software Developer Diaries Resilience and EDA tracks remain separate; unfinished EDA coverage is still in `dev/eda-plan.md`.

## Video 1: source and corrections

Bundle: `/home/vibekdutta/VixiApps/video-translate/vu_output/first-principles-01-physics/`.
Full 2,275-word transcript read; ten sampled frames/contact sheet and the Little's Law frame inspected.
No source references/timestamps in lesson screens; source credit in code comments only.

Coverage: repeated remote lookup waits, batching vs bounded parallelism, latency vs bandwidth, unit conversion/human scale,
FIFO waiting vs service, average occupancy and Little's Law, sequential/shuffled file access, storage economics.

Correct the source's overstatements:

- Remote cache access is not a local variable. Measure the path; network time is not entirely propagation or speed of light.
- A 3 GHz cycle is about 0.333 ns. Human-scale values must follow one consistent scale. Avoid universal L1/RAM/SSD timing tables.
- `await` does not freeze the whole CPU. The request waits; the event loop may handle other work.
- Bandwidth can reduce serialization and queue delay; it does not automatically remove fixed propagation/path delay.
- Little's Law relates averages with a matching boundary and suitable conditions. It does not assert the same count at every instant.
- Mean residence includes queue wait. Do not multiply p99 by offered burst RPS and call the result average concurrency.
- Increasing queue capacity is not increasing useful processing capacity. An overload feedback loop is possible, not implied by the formula alone.
- Warm file reads are not raw SSD latency. Sequential/random rankings depend on block size, queue depth, cache and device.
- LSM writes involve log/memtable, sorted files and compaction. NoSQL is not a physical storage engine category.
- No fixed RAM/SSD/object-storage price ratios, no unsupported dollar-savings figures. Use labelled invented cost units and keep origin copy in cache accounting.

Primary source links and exact measured/model boundaries are recorded in lab 45 README.

## First topic delivery

Track: `fp-core`, always unlocked/free order. Four levels: `fp-physics-kyun`, `fp-physics-kaise`, `fp-physics-code`, `fp-physics-kab`.
Files: `data-v2-fp-physics-1-kyun.js` through `data-v2-fp-physics-4-kab.js`.
Lab: `docker-labs/45-software-physics`.

- Actual HTTP compare: three runs, sequential 513.9–519.7 ms; batch4 126.5–129.0 ms; parallel2 254.2–256.2 ms.
  Same 12 values/order. Lookup calls 12/3/12, peak in-flight 1/1/2. Loopback server has artificial 40 ms wait per request.
- Actual file reads: three runs. Warm page cache. seq4k 43.60–49.62 ms; shuffle4k 41.92–43.15 ms; seq64k 3.09–3.79 ms.
  Same 4 MiB/checksum; 1024/1024/64 Node read operations. No raw-device or physical-I/O ranking claim.
- Fixed-clock slow motion, queue model, mini wiring and arithmetic outputs repeated three times; byte-identical.
- Five behavioral tests cover ordering/bounded concurrency, partial batch, errors/invalid limits and queue accounting.
- Node v24.18.0 run locally. Docker unavailable; compose untested. Redis/RocksDB/AWS not run.

Default manual cache port: 5500 (checked against current System/Kube labs). Self-contained compare uses an owned child on an ephemeral port.
Next free lab after this topic: 46. Inspect all current ports before adding a service.
No commit/push/deploy authorized; a push to this repository publishes the live Cloudflare site.

## Validation and browser review

`node validate.js`: **7843 checks pass**; 14 tracks, 244 levels, 1016 stages, 503 interview questions,
1067 flashcards, 244 diagrams, 330 interactive labs; 45 lab projects.
Eight terminal output blocks match the permanent lab README/captures exactly. Code panes match real source files.

Final browser walk: `/tmp/system-gurukul-physics-final-review/REPORT.md` — 390/1280 px,
278 measurements and 214 screenshots, **0 blocking issues**, no runtime logs/flow errors.
Three cosmetic phone code-wrapping findings and one partial-highlight note remain.
The fourth cosmetic finding is a false positive: the table's hidden header measures 0 px because phone rows become stacked cards.
Manual UI measurement confirmed 272 px cells with labels and no horizontal overflow; screenshots and `manual-ui.json` are in the same folder.
Documentation-link colour is the readable accent (`rgb(110, 168, 254)`). Vertical diagrams show both endpoints on the phone.
The earlier `/tmp/system-gurukul-physics-review/` run is superseded; it mixed the initial and fixed layouts.

## Video 2: Math of Scale (2026-11-08)

Bundle: `/home/vibekdutta/VixiApps/video-translate/vu_output/first-principles-02-math/`. Built by Claude; Codex fact-checked.
Levels `fp-scale-kyun` → `fp-scale-kaise` → `fp-scale-code` → `fp-scale-kab` (`data-v2-fp-scale-1…4`, group "📈 Math of Scale",
guide `scale`). Builders: `sdg-codex-xp/jobs/fp2/levels/*.py`. Lab 52 (`docker-labs/52-scale-math`): seeded simulations for
tail, fan-out, knee and hedging; real worker threads for Amdahl (lock held/wait time measured).

The app already taught percentiles (Flow `latency`), 1 − 0.99^N (`fanout`) and hedging (Google Search story, lab 26), so this
topic takes the first-principles angle: why averages hide the tail, when fan-out amplification needs independence, the
1 ÷ (1 − load) knee and saturation, Amdahl's ceiling (a lock-based serial part beats the curve but keeps 1 ÷ s), and the
three conditions for hedging (independent slowness, safe retries, budget + cancel when busy).

Corrections taught: hedging maths 0.01 × 0.01 = 0.0001, not 0.1, and the delayed hedge needs P(T1 > t) × P(T2 > t − d);
"100× tail" overclaims (paper: one benchmark, 1,800 → 74 ms at p99.9 with 2% more requests); queue wait grows like
1 ÷ (1 − load), not "exponentially", and that comes from queueing theory, not Little's law; 60–70% is a thumb rule; the
opening example (100 ms mean with 1% at 15 s) is arithmetically inconsistent for one request set; unchanged errors on lower
traffic raise the error rate but do not prove requests are not arriving.

Codex's lab review (14 findings, all verified and fixed): extra work now counted in service milliseconds (heavy duplicates
1.2% of copies but 18.2% of work); globally numbered units so locked share is exact at every worker count (was 108/408);
budget can no longer be exceeded on small samples; heavy-request claim scoped to the seed-52 runs; queue example's 80%-busy
window made true (sixth arrival 65 ms); tests now catch the budget, cancel and numbering bugs (mutation-checked).
Codex's level review (16 findings, all verified and fixed): lock held time now read before unlock (88–89%, was 91–95%);
interview questions given explicit inputs (50-service page probability, not page p99); the lab's 1 ÷ (1 − load) named as the
single-worker M/M/1 model, not applied to DB pools or multi-core CPU; heavy-request and switch-path claims scoped; p99 and
mean/median wording made exact; Amdahl no longer named before the Kab level; believable distractors in place of cartoon ones.

## Video 3: Cost of Communication (2026-11-09)

Bundle: `/home/vibekdutta/VixiApps/video-translate/vu_output/first-principles-03-communication/`. Built by Claude; Codex fact-checked.
Levels `fp-comm-kyun` → `fp-comm-kaise` → `fp-comm-code` → `fp-comm-kab` (`data-v2-fp-comm-1…4`, group "📡 Cost of Communication",
guide `comm`, sources `protobufenc`, `tls13`, `http2spec`). Builders: `sdg-codex-xp/jobs/fp3/levels/*.py` (`check.js` = stand-in
check incl. short spellings). Lab 53 (`docker-labs/53-communication-tax`): real HTTP/1.1, keep-alive and HTTP/2 (separate server
process, CPU both sides), a TCP delay proxy model for 20 ms RTT, a hand-written Protobuf wire subset vs JSON (bytes, gzip,
elapsed and CPU), small writes vs one write, and a great-circle distance model.

The Flow track's `networking` level already teaches handshake basics, TCP vs QUIC and head-of-line blocking, so this topic takes
the measured angle: one call's bill (round trips × RTT + work), why faster server code barely helps, chatty vs chunky, warm
connections save handshakes but not the line, pooling ≠ multiplexing, 0-RTT replay, CDN edge as nearby handshakes plus a warm
origin connection, bytes vs CPU in serialization, varint and decoder bounds, small writes and syscalls.

Corrections taught: Protobuf integers are varints read byte by byte (only fixed32/fixed64 copy straight); field keys are varints
too (fields 1–15 fit one byte); HTTP/2 multiplexing is not connection pooling; the video skips TCP + TLS 1.3 (3 RTT); 0-RTT data
can be replayed; syscall ≠ context switch; DPDK and eBPF are different (eBPF runs inside the kernel); "JSON is a disaster, 30% CPU"
has no source and V8's JSON beat the JavaScript Protobuf here; the Discord/gRPC claim is unverified; merging chatty services also
depends on team, deploy and failure boundaries (Prime Video, lab 16).

Codex's lab review (15 findings, all verified and fixed): encoder hung forever on an `Infinity` number; decoder accepted Orders
longer than the buffer, varints crossing message bounds, over-long varints, values above 2^53 − 1, oversized or zero field keys
and invalid UTF-8; the delay proxy could drop queued bytes when a client sent and closed at once; ex2 called wall time "CPU" and
timed JSON and Protobuf over different work; ex1 A ran in a fixed order without warm-up; README fixes (reversed 13–17× sentence,
keys are varints, HTTP/1.1 pipelining exists but the lab client does not use it, DPDK vs eBPF, handshake clock starts at accept,
unprofiled "HTTP/2 framing in JavaScript" claim removed). New tests were mutation-checked against the old library and proxy.
Codex's level review (16 findings, all verified and fixed): small writes were called syscalls (the lab counts JavaScript
`write()` calls only); the gzip result was generalised (it depends on the response size: 1 order 62%, the whole list 98% —
the serialize tool now prints that table); fields 16–2047 have two-byte keys, 2048+ more; QUIC is not "TCP + TLS"; 0-RTT is
QUIC resumption with a ticket, and TLS 1.3 early data still pays TCP's round trip; "line never forms" in HTTP/2 was
overclaimed; the guide's pool tradeoff ignored multi-socket pools; "870 ms ≈ 7 round trips" was unsupported (7 × 128.5 > 870);
varint parsing was called cheaper than JSON; handshake CPU was called microseconds; Protobuf/schema terms were used before
being taught (Code now opens with them); the Prime Video attribution was rewritten to what lab 16 shows; cold HTTP/2 42–44 ms;
the gzip saving is ~11 MB, not 1.57 MB; the parser question's "Sirf …" distractors were replaced with believable mistakes;
the proxy-order test now proves separate arrivals with hooks and cannot leave timers behind (reorder and drop mutations fail).

## Video 4: Anatomy of a Request (2026-11-09)

Bundle: `/home/vibekdutta/VixiApps/video-translate/vu_output/first-principles-04-request/`. Built by Claude; Codex fact-checked.
Levels `fp-req-kyun` → `fp-req-kaise` → `fp-req-code` → `fp-req-kab` (`data-v2-fp-req-1…4`, group "🛣️ Anatomy of a Request",
guide `req`, sources `dnsspec`, `ecs`, `bgpspec`). Builders: `sdg-codex-xp/jobs/fp4/levels/*.py`. Lab 54
(`docker-labs/54-request-anatomy`): a real UDP DNS chain (root, .com and khanakart.com servers on 127.0.0.2/.3/.4:6510, a
recursive resolver with TTL cache, checked against Node's c-ares), seeded packet loss with timeout/retry, a TTL model, real
L4 vs L7 proxies (latency, proxy CPU, which backend), a WAF rules × bytes CPU run, and a BGP selection/forwarding model.

The app already covered anycast/BGP (Cloudflare story), WAF regex blowups (Feed postmortem), L4 vs L7 (Flow) and TTL during
failover (DR), so this topic measures: cold vs warm DNS (100 vs 6–7 ms), a lost UDP question costing the full timeout (5%
loss → p95 1 s; 1% → p99.9 1 s), TTL's trade (queries vs stale share), geo DNS seeing the resolver (ECS), BGP choosing by
policy not speed, anycast not always nearest, a /24-in-/22 leak (YouTube 2008) and RPKI's assumptions, edge TLS (470 → 166 ms),
WAF cost (1 MB × 2,000 rules ~540 ms CPU), L4 path-blindness vs L7's ~2.2–2.6× CPU, and gateway vs service authorization.

Corrections taught: connect() is a syscall, not a context switch, and gets an IP and port, not a URL; radio is not air
vibration; TCP sequence numbers count bytes, not packets; 13 root identities each with many anycast instances; DNS is mostly
UDP; geo DNS sees the resolver; anycast is not "physically nearest"; Sydney ↔ Virginia three round trips are at least 470 ms,
not 450; a WAF reads HTTP after TLS, not DPI; services must keep their own authorization behind a gateway; Kong is OpenResty.

Codex's lab review (21 findings, all verified and fixed): an overlong name could crash a server; ask() accepted replies from
the wrong source or for the wrong type; unrelated answers and additional records were cached (cache poisoning); record data
was read past its length; names were silently aliased; NODATA was reported as NXDOMAIN; the parent answered authoritatively
for the child; a retry test swallowed its assertion; a failed child start could hang the tests; the loss table hid failed
retries; BGP selection and forwarding were mixed; RPKI assumptions were unstated; plus README corrections. New guards are
mutation-checked (name limit, source check, glue filter, zone-cut order, retry timing).

Codex's levels review (17 findings, all verified and fixed): "small loss doesn't change the mean" was false; the loss tool
now prints the mean (6.0 → 13.6 ms at 1% while the median stays 6 ms), and at 5% loss p95 sits on the edge (7–1,004 ms), so
the question asks about p99; the WAF claims are scoped to the lab's linear rules on 1 MiB base64 text and the startup question
states its profiling; a marked BGP answer again put longest-prefix "before policy"; 470 → 166 ms is time to first byte, not
handshake savings; geo DNS and TTL questions now state their assumptions (ECS off, uniform cache ages); glibc's wait is not
a fixed 5 s; the L4 question states the routing requirement; authorization enforcement vs where the decision is made; a
short glossary (byte layout, A/NS/glue/AA/NODATA) now comes before the questions that need it; scoped test summary; source
port vs destination port 53; packet-header accounting assumptions; standalone guide scope; and 18 back-references.

## Video 5: The Physics of Persistence (2026-11-09)

Bundle: `/home/vibekdutta/VixiApps/video-translate/vu_output/first-principles-05-persistence/`. Built by Claude; Codex
fact-checked. Levels `fp-per-kyun` → `fp-per-kaise` → `fp-per-code` → `fp-per-kab` (`data-v2-fp-per-1…4`, group
"💾 Physics of Persistence", guide `per`, sources `gfs`, `fast08`, `wiredtiger`). Builders: `sdg-codex-xp/jobs/fp5/levels/*.py`.
Lab 55 (`docker-labs/55-persistence`): REAL write() vs fsync and group commit (1/8/64 clients), REAL SIGKILL of a writer and
restart, REAL bit flips with CRC32 + replica repair; MODELS for page cache vs power cut (same KV code on a ModelDisk), a
B+tree with an LRU buffer pool, an LSM-tree with size-tiered compaction and bloom filters, and an SSD FTL with greedy GC.

The Data track already teaches B-tree vs LSM amplification in its simulator, so this topic measures what was missing:
fsync's real cost (207–806/s per-record on this WSL2 virtual disk) and group commit (27–98× at 64 clients), app crash vs
power cut, WAL + checkpoint + recovery with the torn-tail rule, checksum vs replica, B-tree lookups with inner pages pinned
(1.00 vs 3.00 reads), random vs sequential keys (UUIDv7), LSM 4.6× write amp and bloom filters, SSD WA 1.21× → 10.47×.

Corrections taught: 100 fsync/s is a spinning-disk figure; FTLs write out of place (no read-erase-rewrite per write) and the
SLC bit direction is reversed in the video; "4 disk trips" assumes a cold cache; MongoDB's WiredTiger stores tables as
B-trees; WAL replay needs a valid base; storage layout does not decide consistency; Raft commits on a majority; GFS uses
primary leases; S3 One Zone classes; RUM is a conjecture; prefix bloom filters can serve prefix range scans.

Codex's lab review (18 findings, all verified and fixed): short writes could acknowledge torn records and a short checkpoint
could destroy the only good copy; a new WAL's directory entry was not fsynced; mid-log checksum damage was cut away
destructively; crash ACK counting raced stdout and could pass without a kill; the cold-lookup comparison changed buffer size;
the torn-tail test did not protect the acknowledged prefix; "false positives" counted unfiltered misses; plus README
corrections. Guards are mutation-checked (write loops, folder fsync, mid-log stop, cut position, commit fsync).

Codex's second, full levels review (18 findings, all verified and fixed, 2026-11-11): a flipped length bit looked like a torn
tail and recovery deleted acknowledged records, so the WAL header now carries its own CRC (12-byte header) and the lab states
its crash-only assumption for auto-trim; group commit kept appending after an I/O error, so `lib/commit.js` is now fail-stop
(failed batch + queued commits rejected, no new commits, close after I/O settles); the folder-fsync test only checked the
open, so it now asserts an fsync on that fd. Level text now scopes power-cut loss as possible (not certain), separates
PostgreSQL's WAL-fsync PANIC from `data_sync_retry`, calls PostgreSQL tables heaps, separates B-tree page-write accounting
from LSM's WAL+flush+compaction total, scopes "key order makes no difference" to the size-tiered model, restates RUM,
conditions bloom's 0.81% on absent keys, scopes the SSD question to the FTL model, gives durability bins a failure scope,
and moves the checkpoint observation out of Kyun. fsync captures were re-run (disk slower in runs 2–3), so the ranges above
are the new runs. 14 lab tests; new guards mutation-checked except the unreachable group-mode "reject new commits" guard.

## Video 6: The Taxonomy of Storage (2026-11-11)

Bundle: `/home/vibekdutta/VixiApps/video-translate/vu_output/first-principles-06-taxonomy/`. Built by Claude; Codex
fact-checked. Levels `fp-tax-kyun` → `fp-tax-kaise` → `fp-tax-code` → `fp-tax-kab` (`data-v2-fp-tax-1…4`, group
"🗂️ Taxonomy of Storage", guide `tax`, sources `dynamo`, `spanner`, `pgvector`). Builders: `sdg-codex-xp/jobs/fp6/levels/*.py`.
Lab 56 (`docker-labs/56-storage-taxonomy`, Node 24 `node:sqlite`): REAL SQLite for three shapes on the same 1 lakh users
(same Q1 object from join+assemble / JSON doc / JS Map), join with vs without an index from 10,000 to 10 lakh users,
friend-of-friend SQL vs adjacency walk (exact-depth endpoints, checked against recursive SQL), schema on write vs read with
partial readers and an idempotent migration, vectors exact vs IVF; MODELS for the six-copy address move and NewSQL
commit waits (serial Postgres sync vs assumed-parallel Raft).

Existing `modeling` and `storage` levels already teach access-pattern-first and polyglot; this topic adds the measured
physics. Corrections taught: an indexed join barely grows with table size (7.7 → 14.2 µs); SQL "screams" on FoF only without
an index (5.0–5.2 s), indexed 2-hop is 162–168 µs and the walk ~8–9× faster; Spanner uses Paxos, not Raft; single-node
Postgres is faster only because it keeps no second copy; exact vector search here is a full scan but the speed comes from the
approximate index, and pgvector does both in Postgres; MongoDB has `$lookup` and optional schema validation.

Codex's lab review (9 findings, all fixed and re-checked, plus one P3 overflow): graph timing allocated an n-sized array
per query (the earlier "SQL ≈ walk" result was this bug), deep walk mixed two definitions, Postgres sync was modeled as
parallel, exact-search universality, the numeric pincode example, Q1 timed different work, k-means lists used stale
assignments, IVF counts omitted centroids, no migration test; generation-stamp overflow.

## Video 7: Sharding (2026-11-13)

Bundle: `/home/vibekdutta/VixiApps/video-translate/vu_output/first-principles-07-sharding/`. Built by Claude; Codex
fact-checked the video claims (`sdg-codex-xp/jobs/fp7/CLAIMS-REVIEW.md`) and the lab. Levels `fp-shard-kyun` →
`fp-shard-kaise` → `fp-shard-code` → `fp-shard-kab` (`data-v2-fp-shard-1…4`, group "🔪 Sharding", guide `shard`, sources
`karger`, `rediscluster`, `twsnowflake`, `rfc9562`, `stripemig`). Builders: `sdg-codex-xp/jobs/fp7/levels/*.py`.
Lab 57 (`docker-labs/57-sharding`, Node 24 `node:sqlite` + worker_threads; each shard is a worker thread with its own
SQLite file): REAL range vs hash shard keys (hot tail, range and id queries with total shard work, fsync on one shared
disk), key moves for `hash % N` vs a vnode ring, a viral vote key split into 1 / 10 / 40 sub-keys with three ways to read
the total, 10 lakh inserts with six primary-key types plus Snowflake guards, co-location and a cross-shard transfer crash,
and a seeded backfill race with four write rules, a sample check and repair.

Lab 34 (ring, vnodes, cache misses) and lab 10 (dual write vs CDC, shadow cutover) already existed; this topic adds what
they do not measure. Corrections taught: `hash % N` moves N/(N+1) on adding a shard ((N−1)/N is removal); with A 12, B 1,
C 2 the long arc belongs to A; vnodes are near-even, not perfect; Redis Cluster uses 16,384 hash slots, not a ring; the ring
is documented for Dynamo (2007), not the DynamoDB service; a hot key split 10 ways gave ~1.5–2.2× writes (sub-keys collide; the busiest shard is the limit)
and reads cost k calls with latency set by how they are sent; Snowflake's 10 bits are generator ids (5 + 5), uniqueness
needs distinct ids and a clock guard, order is only k-sorted; UUIDv7 (RFC 9562) is the time-ordered UUID; a version check
alone cannot stop a deleted row coming back (tombstones), and a random sample is not proof of 100% consistency.

Codex's lab review (4 P2 + 4 P3, all fixed and re-checked): the ex2 router was saturated (votes now go as typed arrays
and both ex1/ex2 print router CPU %; ex1 also pipelines), backfill compare ignored the payload (whole-row compare,
source-wins repair), UUIDv7 is random within one ms, Snowflake restart reuse and the 41-bit window (plus state left
unchanged after a rejected time), placements changed between ex2 rounds, "heap + index" was a rowid table, and the sampler
had no test. The levels review added the stopped-traffic repair boundary, saga vs 2PC guarantees, per-mode ex5 counts,
SQLite REPLACE semantics, and dry-run clock values shown as t − EPOCH.

## Video 8: CAP Theorem & PACELC (2026-11-13)

Bundle: `/home/vibekdutta/VixiApps/video-translate/vu_output/first-principles-08-cap/`. Built by Claude; Codex fact-checked
the video claims (`sdg-codex-xp/jobs/fp8/CLAIMS-REVIEW.md`) and the lab. Levels `fp-cap-kyun` → `fp-cap-kaise` →
`fp-cap-code` → `fp-cap-kab` (`data-v2-fp-cap-1…4`, group "🔀 CAP & PACELC", guide `capelc`, sources `brewer12`, `abadi`,
`terry94`, `crdt11`). Builders: `sdg-codex-xp/jobs/fp8/levels/*.py`.
Lab 58 (`docker-labs/58-cap`, Node 24, zero deps): REAL worker-thread failure detectors (2 s pause vs a real stop, three
timeouts); real timers with a modeled network for async / sync-any-1 / sync-all latency and a primary crash; seeded models
for a 3 | 2 split with four ATM rules, replica lag with read-your-writes / monotonic / causal fixes, LWW vs version vectors vs
CRDTs (G-Counter, OR-Set), and split brain with quorum and a fencing token.

The `cap` and `eventual` levels (data-dist.js) and the clocks material (data-gaps.js) already teach the concepts; this topic
adds measurements. Corrections taught: CP refuses the affected side, it does not shut nodes down; a 3 | 2 split keeps the
majority writing; real ATM networks allow bounded stand-in withdrawals (the earlier CAP level's ATM rule assumes "never more
than the balance"); PACELC is Abadi's and classified Dynamo, not today's DynamoDB; sync latency follows the ack threshold;
single-node Postgres is not automatically linearizable; session guarantees are separate, not one ladder; Figma uses a central
server and Google Docs uses OT; five nines is ~5 min 15 s a year.

Codex's lab review (6 P2 + 4 P3, fixed): a dead primary still acknowledged sync writes, detector start-up could produce
negative detection times, "1 leader" with a quorum ignored the stale leader's belief, OR-Set/counter keys like
"constructor" broke the helpers, tests missed four main claims, plus wording on copies vs consistency, crash timing, the
Terry taxonomy and the 54.6% stale-read cause.

## Next

Continue with numbered video 9, `xU-7JxwUpLo` (Distributed Consensus & Raft); check the existing consensus levels and
lab 09 (Raft election, quorum partition) first. Videos 1–8 are built; seven remain.
