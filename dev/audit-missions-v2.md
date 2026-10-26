# Terminal engine and v2 audit evidence

Local work only. No Docker, live services, clusters, installs, commits or pushes.

## Terminal work

All 52 terminal missions, including 3 embedded interview terminals, now have explicit `solution[]` and `verify(sim)` data. `tools/replay-missions.js` uses the actual renderer/engine. Current completed run: 52 missions, 301 single-step omissions, 3,952 malformed-input attempts, 13,401 checks, 7,802 commands. Every intended chain wins exactly on the final step; every single-step omission fails. Additional regressions undo live fixes after earlier successful observations, reject impossible numeric/internal/prototype edits, enforce reset isolation and validate HTTP/header/cursor/migration semantics. Log: `/tmp/sdg-terminal-final.log`.

Fixed early completion in IDs, consistent hashing, breaker and resilience boss. Fixed shedding's wrong success: admission 5,000 exceeded model capacity ~278 rps but old checklist accepted any second load. Intended admission now 200, same offered 50,000 rps, unsaturated admitted work and explicit queued traffic. Fixed stampede mission claiming cache-off measurement while cache stayed enabled. Failed dependency requests now 504 unless fallback supplies a successful response. Invalid cursor input now gets a realistic 400 rather than fabricated valid JSON. Reset clears evidence/history/token state and restores exact mission tables. Fresh measurements invalidate stale metrics after config changes. Parsing rejects unknown flags, malformed URLs, missing headers, unbounded retry counts and structural state corruption. `perfsim.js` and eight terminal-bearing content files now keep helpers inside closures; shared helpers live under SD.

Teaching model limits: prices/costs and p99 are deterministic illustrative values; bulkhead mission verifies the live concurrency cap and bounded timeout but does not model independent worker lanes; waiting-room buckets are not a durable queue implementation; cursor parser validates a small teaching schema, not signatures; auth tokens are teaching fixtures, not JWT verification.

## Assigned v2 MCQs

183 questions across 22 chaos, DR, health, EDA and physics files were individually rewritten with plausible concise choices and explicit per-option rationale. Answer indices preserved. Owned batch: 0 length flags, 183/183 complete option feedback. `node validate.js` after applying them: 20,850 passing checks, no errors.

Code-specific answers traced through the current local lab sources: `docker-labs/42-chaos/lib/experiment.js`, `monkey.js`; `40-disaster-recovery/lib/replicator.js`, `failover.js`; `43-health-checks/lib/health.js`, `checker.js`; `44-event-driven/lib/order.js`, `bus.js`; `45-software-physics/lib/lookups.js`, `parallel.js`; existing captures remain historical evidence, not newly rerun live tests.

Important corrections include: finally attempts cleanup but does not guarantee external rollback success; identical seeded RNG repeats victim choices but not arbitrary production timing; accepted/202 differs from completed effects; failed/unacknowledged writes can have ambiguous outcomes and require idempotency/status resolution; synchronous replication needs durable acknowledgment semantics for a production RPO claim; save+publish requires transactional intent/relay handling; Node emit invokes listeners synchronously but does not await async completion; local concurrency caps are not global; warm page-cache reads do not benchmark physical storage; ALB fail-open is named specifically rather than claiming a rule for every AWS balancer.

## Primary references verified during this turn

- PostgreSQL OFFSET cost / unique ordering: https://www.postgresql.org/docs/current/queries-limit.html
- PostgreSQL multi-column tie-break ordering: https://www.postgresql.org/docs/current/queries-order.html
- Load shedding, goodput and accepted-request latency: https://aws.amazon.com/builders-library/using-load-shedding-to-avoid-overload/
- Per-upstream connection/request/retry caps: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/circuit_breaking
- Active/passive outlier detection and active-success unejection interaction: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier
- Experiment hypothesis/fault diversity/limited fallout: https://principlesofchaos.org/
- Chaos Monkey termination scope: https://netflix.github.io/chaosmonkey/
- Kubernetes probe behavior, startup gating and defaults: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- ALB all-unhealthy fail-open and healthy-pass defaults: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html
- Terminus shutdown integration: https://github.com/godaddy/terminus
- AWS DR preparedness, restore testing and historical recovery: https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html
- Route 53 failure-count / interval defaults: https://docs.aws.amazon.com/Route53/latest/APIReference/API_HealthCheckConfig.html
- S3 delete-marker configuration/version-ID delete distinctions: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-what-is-isnot-replicated.html
- Aurora unplanned loss depends on failure-time lag, planned switchover different: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database-disaster-recovery.html
- Fanout vs competing consumer subscriptions: https://www.rabbitmq.com/tutorials/tutorial-three-javascript
- Native Node EventEmitter async completion: https://nodejs.org/api/events.html#asynchronous-vs-synchronous
- Pipelining reduces repeated RTT waits; HTTP batch lab is not Redis: https://redis.io/docs/latest/develop/using-commands/pipelining/
- Buffered file reads use page cache: https://www.kernel.org/doc/html/latest/mm/page_cache.html

Sources support general facts. Exact lab timings/counters come from current code and stored captures; they are not API guarantees or new production measurements.
