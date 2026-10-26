# First 11 company case studies: factual consistency pass

Reviewed `data-st-01-reddit.js` through `data-st-11-dropbox.js`, including lesson/card/visual alignment with the rewritten MCQs. Corrected 55 explanation pairs (`explain` and the correct option's `choiceExplanations` entry) and 238 merged-word spacing problems. Kept answer indices and action fixture ordering intact.

Key corrections:

- PostgreSQL DDL depends on operation/version: not every ALTER requires a table rewrite. Constant-default column additions can avoid rewriting rows.
- Reddit formulas are explicitly historical; the displayed hot formula is the positive-score simplification. Wilson best-sort is a described archived mode, not a claim about every current Reddit ranking. Removing time is valid only if the product ranking contract allows it; common additive time terms do not necessarily reorder items.
- Anycast does not guarantee evenly distributed attack load or eliminate BGP/control-plane failures. Shared edge infrastructure lowers some setup costs; bandwidth, CPU and operations do not become free.
- Cloudflare timer restrictions are one defense layer. Its August 2026 primary research demonstrates remote leakage and describes improved DyPrIs, V8 Sandbox and MPK isolation. Updated the lesson, design rationale, visual, question and flashcard rather than repeating the old impractical-attack claim.
- Synchronous writes to a database and separate search index do not create atomicity. Reconciliation and reliable change capture remain distinct concerns.
- Standard Snowflake warehouse compute billing includes a 60-second start/resume minimum, then per-second billing. Local cache state is distinct from durable shared source data.
- Airtable's Rust database works with multiple Node worker threads. The old bottleneck was a large shared mutable object layout/memory lifecycle, not a universal inability of Node to use multiple cores. Single-writer scheduling simplifies ordering but transactions/snapshot semantics still matter.
- Delivery replay is bounded and requires durable catch-up/acknowledgment semantics. At-least-once dedupe is a concrete design choice, not proof that all scoped exactly-once guarantees are impossible.
- Discord history is append-heavy, not undeletable. Logical partition locality does not mean every read contacts exactly one physical node; replication and consistency policies matter. No JVM GC does not mean zero stalls.
- Reed-Solomon loss budgets are per stripe. Five missing shards in the lab's shared layout cannot establish that every EC system loses all files. Failure-domain placement reduces correlated risk rather than making it impossible. SMR/immutable workloads retain compaction, relocation, repair and lifecycle costs; no claim is made that public-cloud providers cannot use specialized hardware.

Primary sources opened during this review:

- PostgreSQL DDL behavior: https://www.postgresql.org/docs/current/ddl-alter.html
- Archived Reddit hot/confidence implementation: https://github.com/reddit-archive/reddit/blob/master/r2/r2/lib/db/_sorts.pyx
- Cloudflare timer/isolation research (August 19, 2026): https://blog.cloudflare.com/revisiting-spectre-attacks-on-workers/
- Node worker threads: https://nodejs.org/api/worker_threads.html
- Airtable's own Rust migration writeup, including Node worker-thread architecture (March 6, 2026): https://medium.com/airtable-eng/rewriting-our-database-in-rust-f64e37a482ef
- Standard warehouse billing: https://docs.snowflake.com/en/user-guide/cost-understanding-compute
- Dual-write consistency and outbox considerations: https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html
- Discord's historical storage/migration writeup (March 6, 2023): https://discord.com/blog/how-discord-stores-trillions-of-messages
- Dropbox immutable block architecture (May 6, 2016): https://dropbox.tech/infrastructure/inside-the-magic-pocket
- Reed-Solomon implementation/shard recovery model: https://github.com/Backblaze/JavaReedSolomon

Historical videos and existing lab captures remain labeled case-study/model evidence. They are not newly measured production numbers, current service limits, current price quotes, or an end-to-end reproduction of those companies' systems. No Docker, services, installs, commits or pushes were run for this review.
