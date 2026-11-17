# Roadmap ko practice mein badlo

Start at [Success 4](../../index.html#level=sds-contracts-kab). One problem lo: short link create karo, phir redirect karo. Notes saamne rakho. Countdown nahi hai. Har experiment alag run kar sakte ho.

Commands **`sys-design-gurukul` folder** mein Node.js se run karo. Network, Docker, Redis ya cloud account nahi chahiye. [run.cjs](run.cjs) original RAM models chalati hai; external service ka benchmark nahi hai.

## 1. Requirements: user ko kya result chahiye?

Feature: created link usable ho. Quality target: selected window ke eligible public redirects mein **99% correct destination par 200 ms ke andar** complete hon. Real product mein window, traffic, eligibility and timeout policy agree karo. SLI observed measurement hai; SLO target hai; SLA agreement hai.

Predict: 98 requests correct in 100 ms, 1 correct in 400 ms, 1 timeout in 2,000 ms. Success rate aur combined good rate same hain?

```bash
node practical-labs/design-roadmap/run.cjs metrics
```

Result: success **99%**; correct-and-fast **98%**; successful-request p95 **100 ms**. Target miss hua. Fast wrong destination bhi bad hai. Successful p95 alone failures ko cover nahi karti.

Change: `quality(rows,200)` ka threshold 500 karo in a scratch copy. Combined rate 99% hogi. Rule change hua; measured requests faster nahi hui. Target ko failure hide karne ke liye silently change mat karo.

Interview answer: “Main good request, denominator aur window define karunga. Latency aur errors dono dekhunga.” Project action: actual client-observed records collect karo; server-only timing network wait omit kar sakti hai.

## 2. API: caller aur resource ko alag rakho

Private submission example: verified user Alice, tenant school1, scope `submissions:read`. Scope allowed action batati hai. Alice ko Bob ki private submission padhne ka right automatically nahi milta.

```bash
node practical-labs/design-roadmap/run.cjs permission
```

Result: Alice ka own resource allowed; Bob, different tenant, missing scope, application-only identity and anonymous denied. **Trusted principal is an input assumption.** Token signature, issuer, audience, expiry, session revocation and login flow are not implemented here. Raw request fields ko principal mat maano.

Change: scratch copy mein owner check remove karo. Bob-denied assertion fail hogi. Tenant check remove karo toh cross-tenant assertion fail hogi. Explain which boundary disappeared.

[OpenID Connect](https://openid.net/specs/openid-connect-core-1_0.html) adds end-user authentication to OAuth 2.0. API keys may identify applications. Resource authorization is still the application's job.

## 3. High-level design: har arrow ka operation likho

```text
Client --create(destination)--> Link API --reserve code + save mapping--> DB
Client <--created after commit-- Link API <----------committed----------- DB
Client --resolve(code)---------> Link API --read mapping---------------> DB
Client <--redirect destination-- Link API <----------destination--------- DB
```

Diagram responsibilities dikhata hai. Separate deployed service per box compulsory nahi. Read path initially same authoritative DB use karta hai. Cache/replica add karoge toh freshness contract aur failure test repeat karo.

Run real commit/collision/crash practice in [design review](../design-review/README.md). That lab uses SQLite. It does not prove Redis durability or replicated failover.

## 4. Deep dive: two counters se duplicate code

Predict: key A starts at 0; key B starts at 0. Har key increment hoti hai. Complete ID mein sirf resulting number use hua. Kya base62 uniqueness add karegi?

```bash
node practical-labs/design-roadmap/run.cjs counters
node practical-labs/design-roadmap/run.cjs restart
```

Result: both numeric values 1; both base62 codes `1`. `A:1` and `B:1` differ only because namespace included hai. [Redis INCR](https://redis.io/docs/latest/commands/incr/) operates on a key; independent keys do not allocate a shared global range.

Restart example deliberately replaces the RAM generator while registry remains. Generator reuses `A:1`. Registry rejects collision and preserves `first-menu`. A supplied new incarnation 7 produces a different ID. **Exclusive incarnation allocation is assumed, not implemented.** Namespace ownership, persisted counter state, failover, rollover and non-reuse need an actual allocator design. This is not a Redis or Snowflake implementation.

Last check deletes the old registry guard and reuses `A:1`. Old external link can now point at `third-menu`. Expiry and ID reuse require an explicit product policy. Retaining a tombstone or preventing ID reuse can protect old-link meaning, with storage/allocator costs.

Change: remove namespace from IDs and predict the first collision. Then keep namespace but reset the counter. Explain why the two failures need different controls. A RAM `Map.has` followed by `Map.set` is one synchronous local example; cross-process uniqueness belongs in an atomic shared authority.

## 5. Deep dive: network split ka concrete result

```text
Initial:             A=0 ------- B=0
Link partition:      A=0    X    B=0
Write1 at A returns: A=1    X    B=0
Later read at B:     local0, or cannot_confirm_latest
```

```bash
node practical-labs/design-roadmap/run.cjs partition
```

Result: stale B returns 0 after A acknowledged 1. B sees the same local state in another history where A never wrote. Guessing 1 cannot be a general fix. Strict read refuses until the link heals. A successful value read is unavailable during that split; sending an error is not successful completion of the read operation.

CAP's C means linearizability; a read starting after a completed write must reflect it or a later write. CAP's formal availability differs from a monthly success-rate SLO. See [Gilbert and Lynch's paper, sections 2–3](https://www.comp.nus.edu.sg/~gilbert/pubs/BrewersConjecture-SigAct.pdf). Choose behavior for the specific operation and failure. Public recommendations and revoked private access may need different contracts within one product.

This lab has one writer, deterministic state and a simulated broken link. No sockets, quorum, election, simultaneous writes or recovery log. Healing copies A into B; earlier returned stale answers remain historical violations. Change: skip the write and inspect B's same local state. Explain what information B lacks.

## 6. Agla lesson observed gap se choose karo

Links existing course gates respect karte hain. Agar lesson locked ho, app prerequisite dikhayegi. Start with one row; whole table ek sitting mein complete karna zaroori nahi.

| Gap / question | Existing lesson or practical | Visible completion check |
|---|---|---|
| Feature, traffic, latency, throughput, SLI/SLO/SLA | [Estimation](../../index.html#level=estimation), [SLO](../../index.html#level=slo), metrics experiment above | One operation, window, numerator and denominator explain karo |
| CAP, strong/eventual/causal consistency | [CAP](../../index.html#level=cap), [Eventual](../../index.html#level=eventual), [Clocks](../../index.html#level=clocks) | Completed write aur subsequent read ki timeline banao; causally dependent updates ka order explain karo |
| Resources, HTTP methods/status, payload, REST/GraphQL | [Naming](../../index.html#level=naming), [Verbs](../../index.html#level=verbs), [API shape practical](../api-shape/README.md) | Same caller task ke requests aur returned fields count karo; verbs alone REST ki definition nahi |
| Auth, rate limits, pagination, versioning | [Auth](../../index.html#level=auth), [Rate limit](../../index.html#level=ratelimit), [Cursor](../../index.html#level=cursor), [Versioning](../../index.html#level=versioning) | Changed owner, limit exceeded, new page and old-client case predict karo |
| Retry, idempotency, circuit breaker | [Retry identity](../retry-identity/README.md), [Breaker](../../index.html#level=breaker) | Lost response ke baad one operation identity retain karo; bounded deadline explain karo |
| LB, app servers, vertical/horizontal scale, discovery/health | [Routing](../request-routing/README.md), [Scaling](../scaling-decisions/README.md), [Health checks](../../index.html#level=hc-kyun) | Lookup, health assessment and request routing ko separate steps mein trace karo |
| SQL vs other stores; file/object storage | [Storage](../../index.html#level=storage), [Storage practical](../storage-contracts/README.md) | Query, object size, update and transaction needs se choice defend karo |
| Cache/CDN, writes, eviction, invalidation | [Cache decisions](../cache-decisions/README.md), [Media](../../index.html#level=media) | Cached value ka owner, key, freshness and missing/old copy behavior batao |
| Queue/PubSub, event-driven processing, backpressure | [Message topology](../message-topology/README.md), [Backpressure](../../index.html#level=backpressure) | Acknowledgement boundary, duplicate delivery and oldest-job age inspect karo |
| Replica, AZ failure, failover and recovery | [Replication](../../index.html#level=replication), [Replica vs backup](../../index.html#level=replicas-backups) | Promotion authority, lost writes, remaining capacity and restore test identify karo; AZ and region different scopes hain |
| Partition keys and skew | [Sharding](../../index.html#level=sharding), [Scaling practical](../scaling-decisions/README.md) | One hot user/time bucket ko trace karo; shard count alone hot key solve nahi karta |
| Leader election and consensus | [Consensus](../../index.html#level=consensus), [Network split](../../index.html#level=consensus-split) | Leader choose karna aur committed state agree karna separate responsibilities batao |
| Logs, metrics, tracing | [Observability](../../index.html#level=observability) | One slow request ke waits aur service work identify karo; sensitive data logs mein copy mat karo |
| Database-only plans, indexes and transactions | [SQL query cost](../../../sql-gurukul/index.html#level=sds-db-query-cost), [SQLite spatial practical](../../../sql-gurukul/practical-labs/spatial-query/README.md), [SQLite request replay](../../../sql-gurukul/practical-labs/request-replay/README.md) | Actual query plan, affected rows and commit/rollback result inspect karo |

Self-review sentence: “Given **requirement**, main **choice** karunga. Isse **benefit** milega. Cost **tradeoff** hai. **Failure case** ko **test** se check karunga.” Domain information missing ho toh assumption state karo aur targeted clarification lo. No employer rubric or hiring outcome is guaranteed.

Source context: [System Design School roadmap](https://www.youtube.com/watch?v=Ooy-KpRH66M). Video supplies a topic map; exercises, traces, numbers and code here are independently authored. Generic boxes and marketing claims are not implementation evidence.
