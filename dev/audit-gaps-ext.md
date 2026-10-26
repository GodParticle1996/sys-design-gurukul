# Gap and extension content audit

Local code review on 2026-10-23. Scope: `data-gaps.js`, `data-ext-episodes.js`, `data-ext-videos.js`, and `data-ext-sdd1.js`. No external labs were executed.

## Questions and decisions

- Rewrote 87 MCQs with plausible, similar-length options and explanations for every option. Original answer indices, option counts, IDs, and exercise actions remain intact; the UI shuffles presentation.
- Balanced the eight gap design slots without changing IDs or scoring. Labels now state the actual design contracts; feedback explains why incomplete options fail this scenario.
- Full live quality script after these changes: 1,228 MCQs, 43 incident decisions, and 108 design best-option sets; zero length-bias flags, duplicate options, or missing option explanations.
- Corrected nearby lessons, cards, diagrams, and sorting labels so they match the rewritten answers: durable sync catch-up versus a transport guarantee; measured capacity versus NIC arithmetic; TTL-aware DNS; clock uncertainty and causal order; external-effect deduplication; Raft current-term commit and conflict repair; session-expiry semantics; measured connection-pool sizing.

## Simulator corrections

- **Shuffle sharding:** `1/C(N,2)` is now explicitly the full assignment-overlap share when a poison tenant makes both assigned cells unhealthy. It is not presented as the blast radius of one independent cell failure. The lesson distinguishes exact pair overlap, named-cell exposure (`2/N`), partial degradation, correlated dependencies, and the separate uniform single-cell failover headroom model. Existing intended fixture values remain valid.
- **CDC:** capacity equal to ongoing arrivals can no longer claim sub-second catch-up. The explicit fluid model starts with an extra 20k-event burst and ongoing 100k events/s, assumes uniform load and 0.1 s baseline delay, and computes `0.1 + 20000/(capacity - arrivals)`. No positive headroom means no drain. Win requires user-key ordering and numeric catch-up below 2 s. For 32 active consumers, 128k/s capacity gives approximately 0.81 s. This is an analytical teaching model, not measured production Kafka lag.
- Sorting exercise labels distinguish single-DB atomicity from external execution/ownership boundaries. Payment/SMS no longer imply that a generic mutex or fencing token automatically supplies provider-side deduplication.

## Primary sources checked

- [Amazon S3 presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html): bearer capability, scoped access, expiration and credential lifetime. Fixed one-minute expiry removed.
- [Amazon S3 multipart overview](https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html): retry missing parts; preserve uploader part numbers/ETags; use listings to verify progress, and maintained records for completion. Arbitrary byte-offset PUT is a different protocol.
- [RFC 9309](https://www.rfc-editor.org/rfc/rfc9309.html): robots rules govern requested crawler behavior, not authorization; `crawl-delay` is not part of the standardized syntax.
- [AWS shuffle-sharding explanation](https://aws.amazon.com/blogs/architecture/shuffle-sharding-massive-and-magical-fault-isolation/): poison workload can affect both assigned resources; partial overlap requires correctly implemented retries. Uniform placement arithmetic is stated as an assumption.
- [Spanner TrueTime and external consistency](https://docs.cloud.google.com/spanner/docs/true-time-external-consistency): bounded uncertainty and commit wait participate in the consistency protocol. Fixed universal 7 ms claims removed.
- [Raft paper, sections 5.2–5.4.2](https://raft.github.io/raft.pdf): randomized elections, majority voting, current-term replica-count commit restriction, leader completeness, and repair of conflicting suffixes. Uncommitted entries are not universally erased on seeing a higher term.
- [CockroachDB replication design](https://github.com/cockroachdb/cockroach/blob/master/docs/design.md): separate Raft groups for user-data ranges. Consensus is not restricted to metadata.
- [Apache Kafka delivery semantics](https://kafka.apache.org/40/design/design/): transactional Kafka processing has a bounded scope; external destinations require cooperation and atomic coordination of state/output progress.
- [Redis distributed-lock documentation](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/): client pauses, clock assumptions, lease extension, and resource fencing remain relevant with multiple lock replicas.
- [ZooKeeper lock recipes](https://zookeeper.apache.org/doc/r3.9.3/recipes.html): ephemeral sequential nodes, predecessor watches, session expiration, and recoverable create errors. Temporary disconnect is not immediate session expiration.
- [PgBouncer configuration](https://www.pgbouncer.org/config.html) and [feature matrix](https://www.pgbouncer.org/features.html): `min_pool_size` enforcement conditions, server-login retry delay, pooling modes, and configured protocol prepared-statement support. Removed unsupported team-adoption statistics and universal pool-size formulas.
- [PostgreSQL explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html): transaction/session ownership, deadlocks, ordering and retries. Atomic invariants and external effects are separate boundaries.
- [Node.js streams](https://nodejs.org/api/stream.html): writable pressure, drain handling, and pipeline backpressure. Lab memory figures remain scoped to the example.

Historical/video narratives and Docker sample outputs remain learning examples, not evidence of current company infrastructure or newly measured results. Architecture labels do not guarantee durability, freshness, safe retries, or recovery time; each is tied to its actual state/contract.

## Validation

- `node tools/quiz-quality.js --check`: pass, zero flags/gaps across all listed categories.
- `node tools/replay-exercises.js`: 967/967 fixtures pass; 10,726 intended actions and 5,363 omitted-step attempts at this snapshot.
- `node validate.js`: 24,023 checks pass.
- `node --check` on all four owned data files: pass.
- Exhaustive valid-knob sweep for the owned blast and CDC labs: 8,632 settings have matching `check` and `verdict.ok`; six additional semantic/boundary assertions pass (CDC at 100% utilization, wrong key, 32-consumer catch-up; blast insufficient/sufficient spare).
