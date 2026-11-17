# Node workers: copy, share, race, recover

Node 24+; zero dependencies. App folder se:

```bash
node practical-labs/thread-memory/run.cjs
```

Real Node worker threads aur ek fresh child process run hote hain. Koi port, shared service ya database use nahi hota.
Child intentionally code 7 se exit karta hai. Parent sirf apne workers/child ko manage karta hai.

## Pehle predict karo

| Step | Prediction | Checked result |
|---|---|---|
| Ordinary object `{value:0}` workerData mein bheja, worker 7 likhta hai | Parent value? | **0**; worker copy is **7**. PID same, thread ID different. |
| SharedArrayBuffer ka counter worker 7 karta hai | Parent value? | **7** after worker completion. |
| Two workers read 0, then both store their saved value + 1 | Final counter? | **1**, despite two attempts. |
| Same start, but each worker uses Atomics.add | Final counter? | **2**. |
| Worker throws a JavaScript exception | Parent necessarily dies? | Parent error/exit handlers observe it and continue. |
| A newly spawned child exits with code 7 | Parent exit code? | Parent continues; child exit code 7 is observed. |

`Atomics.load` aur `Atomics.store` individually atomic hain. Beech ka calculate step unhe ek atomic increment nahi banata.
Parent dono workers ke **read-complete messages** milne ke baad hi writes release karta hai. Failure random sleep par depend nahi karta.
`Atomics.add` poora read-modify-write ek operation karta hai. Multi-field business transaction phir bhi alag problem hai.

Node workers same OS process mein alag JavaScript engine instances use karte hain. Ordinary JavaScript objects automatically shared nahi hote.
Explicit SharedArrayBuffer same underlying bytes expose karta hai. Sharing coordination ki zaroorat badhati hai.

## Khud badlo

1. Race ko three workers ke saath run karo. Sab release se pehle 0 read karein toh final **1**. Atomic case **3**. Assertions update karo.
2. Shared buffer ki initial value 10 karo. Two-worker race **11**, atomic case **12**. Read assertions bhi 10 karo.
3. Worker ko function-containing object bhejo. Structured clone function copy nahi kar sakta; error ko handle karke explain karo.
4. Same-PID check ko same-thread-ID check mein badlo. Check fail hona chahiye. Process aur thread identity alag kyun hain?

## Decision aur proof limits

CPU-heavy JavaScript ke liye reusable, bounded worker pool evaluate karo. Ordinary async network I/O ko handle karne ke liye usually extra JS worker nahi chahiye.
Startup, copying, coordination, queue length aur actual CPU allocation measure karo. This experiment speed benchmark nahi hai.

Handled worker JS error native process crash ke equivalent nahi. Separate processes heap isolation improve karte hain, par shared files, database,
memory pressure aur host failure still affect multiple workers. A live parent does not prove the failed job completed; retry/reconciliation remains necessary.

Existing Java lab, JDK 21+ required:

```bash
node docker-labs/46-concurrency/start.js ex0-basics
node docker-labs/46-concurrency/start.js ex1-race
```

Java basics actual shared field **7** versus separate JVM field **0** dikhata hai. Existing race lab whole critical section, atomic increments and locks cover karta hai.
Python ka GIL rule Node/Java par apply mat karo. CPython GIL-enabled builds aur free-threaded builds ko distinguish karo; native extensions bhi behavior change kar sakti hain.

References: [Node worker threads](https://nodejs.org/api/worker_threads.html), [CPython free threading](https://docs.python.org/3/howto/free-threading-python.html), [explicit cross-process shared memory](https://docs.python.org/3/library/multiprocessing.shared_memory.html).
