# Seat booking: same thread, multiple handlers, expired owner

System Gurukul folder mein run karo. Node18+, no packages. No database, network or payment call.

```bash
node practical-labs/concurrency-boundaries/run.cjs
node practical-labs/concurrency-boundaries/run.cjs async
node practical-labs/concurrency-boundaries/run.cjs owner
node practical-labs/concurrency-boundaries/run.cjs fence
```

Pehle predict karo, phir run karo. Time limit nahi hai. Har experiment ke baad state likho.

| Experiment | Prediction question | Verified result | Why |
|---|---|---|---|
| `async` | A and B both check seats=1 before await completes. How many confirmations? | Two; seats=−1. Synchronous same-loop claim gives one; seats=0. | Await allows another continuation to run. Two CPU cores are unnecessary. Local synchronous repair does not protect a shared DB across processes. |
| `owner` | One consumer starts two async handlers without awaiting each. Is inventory serialized? | Peak2 and two claims. Await whole handler gives peak1 and one claim. | Process count is not active-handler count. |
| `fence` | Storage accepted34; old33 arrives. Then same34 is retried. | Old33 rejected. Same34 can apply again. | Owner-order protection and duplicate-operation protection differ. |

The async/owner examples execute real JavaScript Promises with explicit synchronization. No sleep-based timing guess is needed. They do not measure parallel CPU execution or throughput. Fencing is a synchronous RAM state model, not a distributed lock implementation.

Change one thing at a time in a copy of `run.cjs`:

1. **Await between check and decrement:** in the repaired claim, make the function async and insert `await Promise.resolve()` after the check. Predict two successes again. Both callers can pass the check before either decrements. Existing one-success assertion should fail.
2. **Consumer overlap:** compare sequential `await handler()` with starting both before awaiting. The first must complete its entire state change before the second checks. An admin writer outside that owner would still break the ownership rule.
3. **Fencing propagation:** issue34 but delay delivery to storage. Send33 first. The model accepts33 because storage still knows only32. After34 arrives, old33 is rejected. Issuance alone does not update every resource.
4. **Fencing versus duplicates:** replay34 twice. The largest-token check accepts equal tokens. Add a separate operation ID, payload match and saved result if the operation must happen once. In-memory dedup still has no crash guarantee.

For real Java mutex, semaphore, deadlock and bounded executor experiments, reuse existing Lab46:

```bash
node docker-labs/46-concurrency/start.js ex1-race
node docker-labs/46-concurrency/start.js ex3-pool
node docker-labs/46-concurrency/start.js ex4-deadlock
node docker-labs/46-concurrency/start.js ex5-workers
```

JDK21+ required. These host commands were rerun: lost update1 versus mutex/atomic2; raw permit leak/double return versus repaired2/2; actual detected deadlock and ordered completion2/2; bounded executor active2/queued2/rejected1; same-key local effects2 versus1. No Docker used. Pool resource IDs are logical connections, not DB sockets. Java idempotency example is one-JVM memory only. [Lab46](../../docker-labs/46-concurrency/README.md) contains build/break/fix instructions and proof limits.

Actual multi-process database claims live in [SQL Gurukul](../../../sql-gurukul/practical-labs/seat-claim/README.md). Retrying a remote charge requires the provider's supported operation identity/status contract; none of these labs sends a charge.

Interview practice: “One seat, two buyers, reply lost after success.” Answer separately: atomic seat claim; short transaction; hold/payment states; retained purchase identity; retry result; overload behavior. A mutex alone covers none of the missing remote-effect contracts.

References: [Node event loop](https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop), [Java Semaphore](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/Semaphore.html), [Hazelcast fencing protocol](https://hazelcast.com/blog/long-live-distributed-locks/). Fencing requires protected-resource enforcement and retained monotonic state; the lab does not implement persistent token allocation or multi-resource coordination.
