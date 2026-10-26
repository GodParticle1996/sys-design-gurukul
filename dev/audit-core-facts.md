# Core and feed factual consistency pass

Reviewed the rewritten core/feed questions against neighboring lessons, flashcards and exercise explanations in `data-flow.js`, `data-api.js`, `data-data.js`, `data-resil.js`, `data-dist.js`, `data-shapes.js`, `data-builds.js`, `data-feed.js` and `data-feed-2.js`. Earlier question rewrites cover 456 MCQs, 43 incident decisions and 100 design slots in these files; this follow-up aligns nearby teaching content and removes 369 merged-word occurrences. Tradeoff exercise objects/models were excluded because their state contracts have a separate audit.

Corrections include:

- PostgreSQL index selection has no universal 90% selectivity cutoff. Multicolumn B-tree indexes can use nonleading predicates, including PostgreSQL 18 skip scans; rightward index predicates may still reduce heap visits. A covering index does not guarantee zero heap fetches because MVCC visibility still matters. Index maintenance is not a fixed count of physical I/O, and HOT updates can avoid new index entries.
- JWT validation needs signature and relevant claim checks. Locally validating tokens does not make immediate revocation mathematically impossible: deny lists, token versions and introspection add state and freshness tradeoffs. Token lifetimes are example policies rather than universal defaults.
- Parallel-call slow-event multiplication explicitly assumes independence. Individual latency p99 values cannot simply be summed or maximized to derive an end-to-end p99. The serial/parallel arithmetic example now uses illustrative individual request durations.
- Scoped transactional exactly-once processing is distinct from network-delivery count and external payment/email/shipping effects. A local conditional claim or UNIQUE record does not atomically ship a parcel or charge an external provider. Durable outbox handoff depends on relay recovery, retention and durable state; neither UNIQUE nor an outbox is coordination-free or immune to all storage failures.
- Removed stale option-position explanations that no longer matched the rewritten/shuffled answers. Corrected an opaque-cursor answer whose Roman Hindi wording accidentally reversed its intended meaning; opaque encoding alone does not provide tamper protection or authorization.
- H3/geohash cells produce geographic candidates. Coverage must include boundary-crossing cells, followed by exact distance checks; H3 pentagons/distortion invalidate a universal equal-neighbor-distance explanation.
- Corrected base62 capacity: 62^7 is approximately 3.52 trillion, or 35.2 kharab, not 3.5 kharab. Modular multiplication is invertible only when its multiplier is coprime to the modulus; being odd alone is insufficient for modulus 62^7. A full 64-bit Snowflake cannot fit losslessly into seven base62 characters. Encoding/scrambling does not replace authorization.
- One billion daily platform video views are about 11,574 average events per second across all videos; that total is not automatically one hot row. Video CDN hit ratios and provider prices remain scenario assumptions. Byte hit ratio, shield boundary and delivery volume must stay consistent when deriving doubled origin bytes. Quantization reduces raw payload bytes; graph/metadata/reranking copies still consume memory.
- The November 2025 Cloudflare source describes additional schema metadata causing more than doubled query rows and a generated file exceeding 200 features. Removed a misleading exact doubling explanation from a 60-to-240 toy chart. Replay percentages and intermediate chart counts are explicitly illustrative; corrected the Workers KV mitigation time to 13:04 UTC.

Primary sources opened for this pass:

- [PostgreSQL multicolumn indexes](https://www.postgresql.org/docs/current/indexes-multicolumn.html)
- [PostgreSQL index-only scans](https://www.postgresql.org/docs/current/indexes-index-only-scans.html)
- [PostgreSQL examining index usage](https://www.postgresql.org/docs/current/indexes-examine.html)
- [PostgreSQL HOT updates](https://www.postgresql.org/docs/current/storage-hot.html)
- [PostgreSQL explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html)
- [Apache Kafka message delivery semantics](https://kafka.apache.org/41/design/design/#semantics)
- [AWS transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
- [Redis distributed-lock assumptions](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/)
- [RFC 7519: JSON Web Token](https://www.rfc-editor.org/rfc/rfc7519.html)
- [RFC 7662: OAuth token introspection](https://www.rfc-editor.org/rfc/rfc7662.html)
- [RFC 9562: UUIDs](https://www.rfc-editor.org/rfc/rfc9562.html)
- [RFC 9111: HTTP caching](https://www.rfc-editor.org/rfc/rfc9111)
- [H3 traversal and distortion limits](https://h3geo.org/docs/api/traversal/)
- [Cloudflare November 18, 2025 incident](https://blog.cloudflare.com/18-november-2025-outage/)

Historical case-study references and browser simulator metrics do not establish current provider capacity, current pricing or reproduced production measurements. No Docker, installs, services, commits or pushes were run during this pass.

Validation after the consistency edits:

- `node validate.js`: 24,040 checks pass.
- `node tools/quiz-quality.js --check`: 1,228 MCQs, 43 incident decisions and 108 design slots; zero length-bias flags, missing explanations or duplicate MCQ options. Seeded presented-position deviation is 2.58% for three options and 1.97% for four options.
- `node tools/replay-exercises.js`: 967/967 fixtures pass, including wrong-action and 5,363 omitted-step attempts.
- `node tools/replay-missions.js`: 52/52 missions pass, 301 omitted-step and 3,952 malformed-input attempts; 13,401 checks across 7,802 commands.
- `git diff --check`: clean.
