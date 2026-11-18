# Cache: correct copy, bounded refill

Start with existing `caching`, `stampede` and `eviction` levels. Yeh original Node experiments hain. Maps and controlled promises run in one process; Redis, real database and HTTP load run nahi hota. Two independent pending maps model two app instances, not actual child processes. No timer in learner steps.

App folder `sys-design-gurukul` mein:

```bash
node practical-labs/cache-decisions/run.cjs keys
node practical-labs/cache-decisions/run.cjs lru
node practical-labs/cache-decisions/run.cjs negative
node practical-labs/cache-decisions/run.cjs singleflight
node practical-labs/cache-decisions/run.cjs lease
node practical-labs/cache-decisions/run.cjs jitter
node practical-labs/cache-decisions/run.cjs budget
```

| Predict first | Worked observation |
|---|---|
| EUR request uses product-only key previously filled for USD. | Wrong USD value is a cache hit. Add tenant, representation version, product and currency in this scenario. Authorization remains separate. |
| Capacity2; put A,B; read A; put C. Which leaves? | B is least recently used and evicted before expiry. At fixed t=100, A and C expire. Hits do not renew this lab's fixed TTL. |
| Repeated missing product lookup; then product created. | Negative result saves repeated DB lookups but can hide newly created product. Create invalidates negative; expiry is another policy, with stale-negative window. |
| 1000 overlapping reads of one absent key. | No coalescing:1000 loader calls. Shared pending map:1. Two independent maps:2. All calls are held behind an explicit barrier before completion. |
| Shared load throws. Does next request stay stuck on old rejection? | Failed batch rejects all20 waiters, pending state clears, next request succeeds. Loader hang/cancellation/deadline not implemented. |
| Old reader has token; delete revokes token; old reader fills. | Old token rejected. Generation model shows stale-fill prevention after invalidation. Full distributed lease expiry, token uniqueness across restart, failover and DB-to-invalidation reliability are out of scope. |
| 100k TTLs jittered around one hour ±10%. | Expiry window is54–66minutes; average138.89 expiries/s. Seeded peak is printed and differs from average. Without requests, those expiries make zero DB reads. |
| Cold cache,10k reads/s, DB assumed5k/s capacity. | Blind fallback overloads DB. Chosen policy admits4k/s plus500/s warming; other6k/s need bounded defer, shed or permitted degraded response. This is a budget calculation, not implementation of rate limiting. |

Every cache key dimension has a reason. Same public image might safely share one key. Account-specific response requires trusted identity scope and access checks. Don't cache permission failures as global product absence. Invalid IDs can be rejected before lookup; random unique misses can fill negative-cache memory, so size/admission and rate limits still matter.

Try changes with a prediction:

1. `keys`: remove currency from `good`. EUR should collide with USD and assertion fails. Then restore currency; remove tenant and inspect other-tenant collision.
2. `singleflight`: disable coalescing. Shared pending state no longer combines requests. A process-local map cannot coalesce across all processes.
3. `singleflight`: remove `.finally` cleanup. Failure leaves rejected pending task; later retry fails. Production also needs a bounded loader and waiters, not indefinite promises.
4. `lease`: accept every token. Old reader can restore deleted old value. Token verification and cache fill must be one atomic operation in the relevant implementation.
5. `jitter`: choose TTL range54–60minutes for a hard60-minute entry-age maximum. Span becomes360seconds;100k/360=277.78 average expiries/s, twice the original average. Entry age still does not prove DB freshness.
6. `budget`: add a1000/s write workload to the assumed shared DB. The original4500 read+warmup budget now totals5500 operations/s, above5000 only if these operations consume comparable capacity. In reality profile query/write resource costs; operation counts alone can hide cost differences.

Use [scaling cache race](../scaling-decisions/README.md) for delete-after-write with an old in-flight read. Deleting a key repeatedly is idempotent as a cache operation; it does not make every concurrent refill safe. Write-through needs defined acknowledgement and concurrent-write/failure coordination. RAM-only write-back can lose acknowledged new data before persistence; durable buffered systems need a different durability analysis.

Sizing exercise:100k×2KB=200MB raw payload;1m×2KB=2GB, decimal. Add keys, metadata, allocator overhead, replicas, variants and headroom. No fixed overhead factor is universal. LRU59% and top1%=68% in the video are scenario/simulation claims, not your store's forecast; obtain workload distribution and replay a representative trace.

Interview answer: “I will state allowed freshness and identity scope first. I will estimate eligible miss load and cold-start load separately. I will coalesce hot-key refills within a named scope, bound waiters and loaders, and budget fallback traffic. TTL jitter spreads expiration; it is not a global database rate limit.”

Primary references: [Redis eviction](https://redis.io/docs/latest/reference/eviction/) for sampled approximate LRU; [Redis Bloom filter](https://redis.io/docs/latest/develop/data-types/probabilistic/bloom-filter/) for membership testing; [Facebook's 2013 paper, section3.2.1](https://www.usenix.org/system/files/conference/nsdi13/nsdi13-final170.pdf) for key-bound fill tokens and scoped historical peak measurements. These exercises do not reproduce Facebook's production measurement.
