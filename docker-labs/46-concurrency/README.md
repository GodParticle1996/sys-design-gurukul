# Lab 46 — Concurrency: khud todo, phir sambhalo

20 concepts ka dedicated track: ek warm-up aur **paanch build–break–fix labs**.
Java 21 platform threads aur standard-library synchronization. Node launcher ke liye Node 18+;
actual programs ke liye **JDK 21+** (`java` aur `javac` dono). Koi Maven, Gradle ya npm dependency nahi.

```bash
cd docker-labs/46-concurrency
java -version
javac -version
node start.js ex0-basics
node start.js ex1-race
node start.js ex2-queue
node start.js ex3-pool
node start.js ex4-deadlock
node start.js ex5-workers
node start.js test
```

`npm start ex1-race` aur `npm test` bhi wahi launcher use karte hain.
Launcher source ko apne temporary directory mein compile karta hai aur directory finally mein hataata hai.
Programs koi port, database ya existing service nahi chhoote. Basics apna ek fresh JVM child launch karta hai.
Deadlock demo sirf apne do interruptible threads ko detect/stop karta hai; production recovery tool nahi.

## Paanch labs: predict → build → break → fix → verify

Reference implementation source mein hai. Pehle contract aur apna pseudocode likho; phir method body
dekho. Broken baseline ko reference ke liye rakho, apna repair alag method mein likho.
Experiment ke baad baseline restore karke `node start.js test` chalao. Tests broken behavior ko bhi
jaan-boojhkar assert karte hain: broken function repair kar doge toh baseline assertion badlegi.

| Lab | Pehle khud banao | Jaan-boojhkar todo | Repair aur proof |
| --- | --- | --- | --- |
| `ex1-race` · `RaceLab.java` | Do increments ke read/add/write steps aur expected=2 | Dono reads ke baad barrier; actual=1. Sirf write par lock lagaakar failure samjho | Whole critical section ka mutex aur atomic increment: count=2. Nested lock ke matching unlocks aur per-key availability dekho |
| `ex2-queue` · `QueueLab.java` | Capacity 2 FIFO, full put wait, empty take wait, offer/poll result | Unlimited intake mein five waiting items; bounded buffer mein `while` ko `if` karo | Signal-without-space test false insertion pakadta hai. `while` restore: A/B/C once in order; interrupted put ke baad lock free aur queue usable |
| `ex3-pool` · `PoolLab.java` | Semaphore gate + distinct free connection IDs + close | Missing close se permits 1/2; raw double release se 3/2 | Once-only lease close. Failure ke baad permits=2/free=2. Six concurrent borrowers ke test mein peak borrowed 2 |
| `ex4-deadlock` · `DeadlockLab.java` | Do locks aur wait-for arrows | A stock→wallet, B wallet→stock; first-lock barrier cycle arrange karta hai | Detector own IDs dekhta hai. Interruptible finally cleanup; all paths same stock→wallet order par 2/2 complete |
| `ex5-workers` · `WorkersLab.java` | Two workers, two queue slots, rejection policy; same-key local claim | Unbounded waiting queue; same-key get/effect/put gap | Fifth bounded submission reject; first four complete. Atomic local per-key compute: four replies, one effect; changed body reject |

Queue exercise ki interruption check ka precise contract: interrupted put item insert nahi karta,
aur lock release hota hai, isliye agla take/offer chal sakta hai.

## Coverage: saare 20 concepts

| # | Concept | App level / evidence |
| --- | --- | --- |
| 1 | Concurrency | `cc-start`: one-core interleaving MODEL; overlapping tasks |
| 2 | Concurrency vs parallelism | `cc-start`: same-pal execution vs overlapping progress; no speedup benchmark claim |
| 3 | Processes vs threads | `cc-start`, `BasicsLab`: shared parent field 7 vs separate JVM field 0 |
| 4 | Thread lifecycle | `cc-start`, `BasicsLab`: common sketch vs Java's precise enum; blocked/timed wait/terminated |
| 5 | Race condition | `cc-race`, `RaceLab`: forced lost update; single-thread async race interview |
| 6 | Mutex | `cc-race`, `RaceLab`: whole read–add–write critical section |
| 7 | Semaphore | `cc-pool`, `PoolLab`: two permits, timeout, conservation tests |
| 8 | Condition variable | `cc-queue`, `QueueLab`: await releases/reacquires lock; signal does not reserve a slot |
| 9 | Coarse vs fine-grained locking | `cc-locks`, `RaceLab`: independent key tryLock availability, not throughput |
| 10 | Reentrant lock | `cc-locks`, `RaceLab`: same-owner holds 2 → 1 → 0 |
| 11 | Deadlock | `cc-stuck`, `DeadlockLab`: real ownable-synchronizer wait cycle and same-order repair |
| 12 | Livelock | `cc-stuck`: labelled four-round symmetric-reaction MODEL, no useful completion |
| 13 | Starvation | `cc-stuck`: labelled priority-selection MODEL; finite wait is not proof of infinite starvation |
| 14 | Atomic operations | `cc-race`, `RaceLab`: atomic increment; scope is not a multi-variable transaction |
| 15 | Thread pool | `cc-workers`, `WorkersLab`: worker reuse vs waiting-queue limit |
| 16 | Producer–consumer | `cc-queue`, `QueueLab`: capacity 2 FIFO with waiting producer |
| 17 | Blocking vs non-blocking | `cc-queue`: wait vs immediate capacity result; short lock is not formal lock-free progress |
| 18 | Backpressure | `cc-queue` / `cc-workers`: bounded source wait/rejection feedback; outer waiters still need limits |
| 19 | Immutability | `cc-locks`, `RaceLab`: string-list snapshot vs mutable/final reference and nested values |
| 20 | Idempotency under concurrency | `cc-workers`, `WorkersLab`: atomic local claim, same payload/result, explicit crash/multi-pod/provider boundary |

## Naape hue results aur boundary

Host: OpenJDK 21.0.12.1, Node v24.18.0. Har command teen baar chali; captured stdout identical tha.
`captures/*.txt` canonical outputs hain; app ke lab `expect` blocks same captured text rakhte hain.
Numbers chhote arranged schedules se hain, production throughput/latency benchmarks nahi.

- Race lab real threads ko barrier se bad interleaving deta hai. Random sleep race dikhne ka proof nahi.
- Queue/pool ke synchronization primitives real hain. Pool **logical IDs** use karta hai; DB sockets nahi.
- Deadlock real platform threads par hai. Livelock/starvation sections teaching MODELS hain; finite trace
  scheduler fairness ya infinite denial prove nahi karti.
- Executor tests hold first two tasks on a latch before adding three more; occupancy/rejection repeatable hain.
- Dedup local memory/counter effect hai. Crash durability, multi-pod coordination aur remote payments tested nahi.
- Atomic operation ko CPU se kabhi preempt na hone ya all-or-nothing arbitrary business workflow mat samjho.
- Java's `RUNNABLE` includes ready/executing; no separate `RUNNING`. `BLOCKED` specifically monitor entry.

## Optional Docker route — not run here

```bash
docker compose --profile ex1-race run --build --rm race
docker compose --profile ex4-deadlock run --build --rm deadlock
docker compose --profile test run --build --rm tests
```

Other service names: basics, queue, pool, workers; corresponding profiles are the exercise names above.
Container route needs image availability/network for the build. No ports, volumes or long-running service.
Only the host JDK route is verified. No Docker daemon was installed, started or used for this task.

## Primary references

- [Processes and threads](https://docs.oracle.com/javase/tutorial/essential/concurrency/procthread.html)
- [Java 21 Thread.State](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Thread.State.html)
- [ReentrantLock](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/locks/ReentrantLock.html)
- [Atomic variables](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/atomic/package-summary.html)
- [Condition](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/locks/Condition.html)
- [Semaphore, including pool/ownership and fairness contracts](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/Semaphore.html)
- [ThreadPoolExecutor and rejection policies](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ThreadPoolExecutor.html)
- [Executors.newFixedThreadPool](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/Executors.html#newFixedThreadPool(int))
- [ConcurrentHashMap.compute](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html)
- [List.copyOf and unmodifiable lists](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/List.html)
- [Starvation and livelock](https://docs.oracle.com/javase/tutorial/essential/concurrency/starvelive.html)
- [Stripe's documented idempotency contract](https://docs.stripe.com/api/idempotent_requests)

Java tutorial links describe stable concepts; the API-specific contracts above use Java 21 documentation.

## Captured stdout

### ex0-basics

```text
MODEL: ek core A/B ka kaam baari-baari chala sakta hai; do cores zaroori nahi.
ASLI JAVA PLATFORM THREADS; JVM states, OS scheduler measurement nahi
before start=NEW
monitor held by main=BLOCKED
timed latch await=TIMED_WAITING
after join=TERMINATED
thread changed parent field=7
separate JVM field=0
Java RUNNABLE mein ready ya CPU par chal raha thread ho sakta hai; alag RUNNING enum nahi.
```

### ex1-race

```text
ASLI JAVA THREADS; read barrier jaan-boojhkar lagaya hai
broken: expected=2 actual=1
mutex: expected=2 actual=2
atomic increment: expected=2 actual=2
reentrant: holds=2 -> 1 -> 0
other key enters: coarse=false fine=true
immutable snapshot unchanged=true
```

### ex2-queue

```text
ASLI JAVA THREADS; capacity=2, ek producer C ke liye rukta hai
broken unbounded intake: waiting=5 consumer abhi shuru nahi hua
full: size=2 producer=WAITING offer(X)=false
after take(A): producer resumed; remaining=B,C
received=A,B,C empty poll=null
```

### ex3-pool

```text
LOGICAL CONNECTIONS; asli Semaphore, DB/socket nahi
broken missing close: permits=1/2
broken raw double release: permits=3/2
borrowed=1,2 permits=0
third borrow with 20 ms deadline=timed out
after failure + double close: permits=2 free=2
```

### ex4-deadlock

```text
ASLI JAVA THREADS; opposite lock order, interruptible cleanup
deadlock detected=true; demo threads stopped
same lock order: completed=2/2
MODEL livelock: 4 rounds dono raasta badalte rahe; completed=0
MODEL starvation: 4 premium jobs chune; normal job waiting=4 rounds
Finite model trace infinite starvation prove nahi karti; selection rule ko dekho.
```

### ex5-workers

```text
ASLI JAVA EXECUTOR; first 2 jobs latch par roke, phir 3 aur bheje
unbounded: active=2 queued=3 rejected=0 completed=5
bounded: active=2 queued=2 rejected=1 completed=4
check-then-act: same key, effects=2
atomic per-key claim: requests=4 effects=1 replies=order-1 x4
same key different body rejected=true
BOUNDARY: one JVM, memory only; crash/multi-pod/external charge guarantee nahi.
```

### test

```text
24 concurrency behavior checks pass
```

