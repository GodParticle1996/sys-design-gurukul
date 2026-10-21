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

## Next

Continue with numbered video 2, `04ip8kPZXsM`, after inspecting its transcript/frames and existing estimation tools.
Only video 1 has been extracted and implemented so far. The other fourteen lessons remain planned.
