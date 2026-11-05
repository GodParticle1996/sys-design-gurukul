# Concurrency — delivery and review record

The user requested this **new implementation** after the Backpressure cross-review, while Claude was busy.
This is separate authorization from the earlier review-only job in `dev/REVIEW.md`.
The user explicitly chose a dedicated track, Java labs, and the existing simple Hinglish/visual/prediction style.
Work is isolated in `sdg-codex-xp` on `codex/xp-ranks`; source checkout `sys-design-gurukul` remains untouched.
No commit, push or deployment. Claude's review is requested in `../CLAUDE-REVIEW-CONCURRENCY.md`.

## Delivered structure

Track ID `concurrency`, always open/free order. Recommended path:

| Level | Concepts | Investigation |
| --- | --- | --- |
| `cc-start` | 1 concurrency; 2 concurrency vs parallelism; 3 processes vs threads; 4 lifecycle | One-core timeline; real JVM monitor/timed-wait states and separate-process field |
| `cc-race` | 5 race; 6 mutex; 14 atomic | Forced lost update; whole critical section; unlock in finally; atomic increment |
| `cc-locks` | 9 coarse/fine; 10 reentrant; 19 immutability | Independent-key tryLock; hold counts; immutable snapshot and its publication |
| `cc-queue` | 8 condition variable; 16 producer–consumer; 17 blocking/nonblocking; 18 backpressure | Capacity-2 FIFO; blocked producer; predicate recheck after signal; outer waiter bound |
| `cc-pool` | 7 semaphore, plus ownership/cleanup | Logical connection leases; two permits; timeout, failure and duplicate close |
| `cc-stuck` | 11 deadlock; 12 livelock; 13 starvation | Real detected deadlock and ordered repair; labelled finite progress models |
| `cc-workers` | 15 thread pool; 20 concurrent idempotency, plus backpressure | Two workers/two waiting slots; fifth rejection; check-then-act race and local per-key claim |

Each level has one diagram/state walkthrough, one short code/decision stage, one runnable lab stage,
two interview scenarios, flashcards and its own completion decision guide. Total: seven levels (cc-race was split into cc-race + cc-locks on 2026-11-05), 21 teaching
stages plus seven interviews, 56 MCQs and 24 flashcards. Lab 46 has a warm-up and the five requested builds.

Corrected distinctions from the supplied short definitions:

- Concurrency may interleave or execute in parallel; logical races can occur on a single-thread async server.
- JVM states are not a portable OS lifecycle: Java has no separate RUNNING enum; monitor BLOCKED differs from timed waits.
- Condition signal means recheck the predicate after reacquiring the lock, not condition truth or a reserved slot.
- Atomicity has a scope; it does not mean an arbitrary business workflow cannot be interrupted or partially applied.
- Reentrancy is for the same owner and needs matching releases; fine locks still need multi-resource ordering.
- Nonwaiting API results do not establish formal lock-free progress. This teaching buffer uses a short lock.
- Generic Java semaphores have no ownership/maximum-resource invariant; resource assignment and once-only return are separate.
- Thread caps do not bound queueing; bounded admission does not establish durable delivery.
- Immutability is deeper than a final reference. The sample string snapshot is not a general deep-copy mechanism.
- Local in-memory dedup does not establish crash durability, multi-pod coordination or exactly-once external payment.

The quoted promotional paragraph/link was not added to the course. Lessons are self-contained and original;
primary API references are linked in the recaps and the lab README.

## Implementation/integration

`data-v2-concurrency.js` is deliberately self-contained (track, level data, diagrams and guides), loaded
**after** `data-guidance.js`, **before** `app.js`. That permits the existing guide registry to finish its
current coverage checks before the new levels are registered; full validator checks include all new guides.
Adding the file to index, gallery and validator manifests is required.

Two small shared changes:

1. `dockerlab.js`: optional `stage.runtimeNote` overrides the old Node-only setup sentence for Java stages.
   All observation completion, stars, XP and lab-completion tracking stay on the existing code paths.
2. `validate.js`: only raw `stages[N].code.text` is exempt from prose-HTML validation, because the renderer
   escapes it. Source/file/from byte matching still applies. Other lesson fields, including code titles,
   remain HTML-validated. New tests verify `<Runnable>` appears as text, not an element.

24 independently authored static solution fixtures are added alongside the content. They do not infer
expected choices from runtime question objects. Existing wrong-answer, omitted-step and repeat-action
replays cover the new exercises without adding a parallel UI engine.

## Runtime evidence

OpenJDK 21.0.12.1 and Node v24.18.0. All seven Java entry points (warm-up, five labs, tests) ran three
times with identical stdout. Permanent captures are in `docker-labs/46-concurrency/captures/`.
The independent `dev/concurrency-test.js` compiles/runs them again and verifies app/README/capture equality.
The launcher compiles into an owned temporary directory and removes it in finally; no .class files are in the tree.

24 Java behavior checks include arranged lost update, whole-section repair, atomic update, reentrant
release count, immutable string snapshot, independent-key availability, full/empty queue waits, false offer,
signal-without-space, interrupted put, distinct leases, timeout, failure cleanup, duplicate close, concurrent
capacity/ID conservation, detected deadlock cleanup, consistent order, bounded/unbounded admission and
same-key dedup/payload conflict. This is not a performance benchmark.

No database/socket service is opened. The warm-up owns one child JVM; all experiments own their threads.
Deadlock recovery depends on `lockInterruptibly()` and finally cleanup. Livelock and starvation are finite
teaching traces, not claims of real scheduler fairness. Container files are provided but were not built/run.

## Checks

All seven project regression suites plus XP pass. Latest result details are in the Claude review handoff.
App totals: 15 tracks, 250 levels, 1040 stages, 515 interview questions, 1090 flashcards, 250 diagrams,
348 interactive labs and 46 runnable lab projects. Maximum finite first-completion XP is 51,930;
the unchanged 48,000-XP top rank lands at 92.43% of that maximum.

Browser attempts (`dev/shots.js` at 360/1280 and `dev/replay-browser.js`) did not get past Chromium startup:
the environment rejects Crashpad's `setsockopt` call with EPERM and Chromium exits. Existing cached full
Chromium and headless-shell candidates failed. A no-crash-reporter probe also failed. No permission change,
browser install, user-profile access or app server was used. **No screenshot/layout pass is claimed.**
Claude should complete the real phone/desktop pass in its browser-capable environment during cross-review.
