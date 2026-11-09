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

## Next

Continue with numbered video 4, `kt1tW0El6Gg` (The Anatomy of a Request: DNS, BGP, and the Edge), after inspecting its
transcript/frames and the existing Flow `lifecycle`/`networking` and Cloudflare anycast/edge material. Videos 1–3 are built; twelve remain planned.
