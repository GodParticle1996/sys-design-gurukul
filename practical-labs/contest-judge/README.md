# LeetCode judge: ek failure ko predict aur reproduce karo

System Gurukul ke existing lessons: [Colab isolation](../../index.html#level=colab-isolation), [Workers](../../index.html#level=cc-workers), [Leaderboard](../../index.html#level=leaderboard). Har lesson mein two new guided exercises hain. Source: [System Design School](https://www.youtube.com/watch?v=4qUoPbU5jf8). Timestamp review [research notes](../../../research/system-design-school/reviews/4qUoPbU5jf8/ANALYSIS.md) mein hai.

Start with **one experiment**. Pehle answer predict karo. Command run karo. Output explain karo. Last mein one value change karo. Saare experiments ek sitting mein karna zaroori nahi.

System Gurukul folder mein Node se run karo:

```bash
node practical-labs/contest-judge/run.cjs backlog
```

Naam omit karoge toh all six experiments run honge. No packages, servers, accounts or network needed. Source file [run.cjs](run.cjs) hai. Queue/score/projection are bounded models. `updates` actual Promise interleaving execute karta hai. `checker` actual trusted comparison functions execute karta hai. Lab arbitrary submitted code, Redis, Linux isolation, broker ya real contest run nahi karti.

| Experiment | Pehle predict karo | Run ke baad kya dikhega? | One change |
|---|---|---|---|
| `backlog` | 12/s arrive,8/s finish,10s pass. Backlog? Capacity12/s karne se drain? | 40 waiting. Capacity12/s par40 remain. Capacity16/s par10s mein drain. | Capacity16 ko14 karo. Expected drain20s; corresponding assertion update karo. |
| `fairness` | Four slots. Spam8 jobs; Ana/Ben/Cho one each. Per-user running cap2. First dispatch? | spam,Ana,Ben,Cho. Next tick spam2, two idle slots. | Cap2 ko4 karo. Second dispatch four spam jobs; expected assertion update karo. |
| `checker` | Unordered [1,2,2] versus [1,1,2] pass? Infinity equal Infinity allowed? | Both rejected under stated contract. [2,1,2] passes. | Actual duplicate counts fix karo; then pass predict karo. |
| `score` | Ana3/2400, Ben3/3000, Cho4/5000. Rank order? | Cho,Ana,Ben. Invalid penalty and unsafe packed score rejected. | Base range ke bahar penalty test karo. Reject ko clamp se replace karke lost ordering explain karo. |
| `updates` | Two overlapping tasks read3, each writes4. Final? | Broken4. Serialized distinct events plus one duplicate produce5. | Duplicate guard remove karo: three deliveries produce6. |
| `projection` | Full aggregate revision2 arrives before1. Then2 repeats. Final? | Newer rejudge remains0 solved. Different contest retains its own score. | Revision guard remove karo; apply2 then1 and inspect stale state before duplicate2 masks the error. |

To run a different experiment, replace `backlog` in the command with the exact name above. Assertions deliberately encode the original expected result. After an intentional change, first inspect the failure; then update only the expectation justified by your new rule.

## Picture the request

```text
1  API checks caller + bounded submission
2  Source + submission + publication intent become durable
3  API replies 202 with submission ID; result is still pending
4  Relay publishes; dispatcher chooses an eligible user's job
5  Restricted compiler/program receives one test input
6  Trusted checker compares bounded output with protected expected answer
7  DB commits current-generation verdict + result publication intent
8  Board projector consumes versioned canonical score
9  User reads status/board under the agreed freshness rule
```

An arrow means an operation, not an automatic guarantee. Steps2/7 need crash recovery. Steps5/6 need separate security and task-correctness rules. Step8 must tolerate repeated/reordered delivery. No worker can decide a new judging generation by resetting an old verdict.

## Database practice belongs in SQL Gurukul

From the VixiApps root:

```bash
python3 sql-gurukul/practical-labs/judge-verdict/verdict.py
```

[SQL guide](../../../sql-gurukul/practical-labs/judge-verdict/README.md) runs two real SQLite connections, generation-guarded UPDATE, rollback, inbox/outbox and scoring rebuild. SQL lesson [deduplication](../../../sql-gurukul/index.html#level=sds-db-dedup) retains its existing prerequisite.

## Decision practice: kya, kab aur kyun?

| Situation | First decision | Visible evidence |
|---|---|---|
| Submit reply is slow | Separate durable acceptance from judging completion. | Trace202 versus terminal verdict; do not declare verdict at202. |
| Queue grows | Compare arrival and completion rates, oldest age and blocked dependencies. | `backlog`; oldest age is elapsed wait, not a promised new-job ETA. |
| One entrant dominates | Per-user concurrent limit plus fair dispatch; rate/admission limits separately. | `fairness`; idle-slot tradeoff is explicit. |
| Contest and practice share machines | Reserve practice capacity if required; use spare warm machines between contests. | Track both queues' age and delivered capacity. |
| User prints AC | Check bounded output in trusted checker. | `checker`; output99 fails expected3 despite the AC string. |
| Hidden answers leak | Remove expected answers/credentials from user-readable mounts. | Read-only is not confidential. A VM does not override allowed file access. |
| Worker retries after lost ACK | Retain current-generation terminal result and durable publication. | SQL race/redelivery checks; exactly one local effect in the tested transaction. |
| Tests fixed after contest | New generation; pin test/compiler/checker versions; recompute canonical scores. | SQL rejudge and `projection`; stale result must fail. |
| Rank query is slow | Measure SQL plan/index/cache approach before introducing a maintained rank structure. | [SQL query-cost companion](../../../sql-gurukul/practical-labs/query-cost/README.md). No throughput number here is a benchmark. |
| Leaderboard reads dominate | Shared top-page cache, read replicas, or agreed stale polling. | Count personalized reads separately; check compute/replica/cache/poll delays. |
| One contest write key saturates | Measure/batch/coalesce canonical updates or redesign partition/rank aggregation. | More read replicas do not increase writes to that key. |
| Board storage lost | Rebuild from canonical current results plus all scoring inputs. | SQL accepted-only sum90 versus correct penalty130 after rejudge. |
| Add a language | Harness types, compiler image, policy and budgets must agree with task versions. | Validate nulls, integer bounds, serialization and checker compatibility. |
| Queue ETA requested | Estimate for the eligible pool and scheduling policy; show uncertainty. | 2000/50≈40s only under stable comparable service/ordering assumptions. |
| Suspected copied code | Off-path similarity batch flags candidates for human review. | Similar short solutions alone do not prove copying. |

Interview exercise: choose three rows. For each row say **requirement → chosen boundary → failure → observable check → changed requirement that changes the choice**. Project exercise: reproduce one failed assertion and explain the smallest correct repair.

Sandbox technology comparison needs a threat model and measured workload. Namespaces scope views, cgroups enforce configured resource policy, seccomp restricts interfaces, and gVisor/microVMs add distinct execution boundaries. No single label replaces mount, egress, privilege, clean-state and resource policies. See [Linux seccomp](https://docs.kernel.org/userspace-api/seccomp_filter.html) and [gVisor security](https://gvisor.dev/docs/architecture_guide/security/).

Redis numeric/rank details: [ZADD](https://redis.io/docs/latest/commands/zadd/), [ZREVRANK](https://redis.io/docs/latest/commands/zrevrank/), [script execution](https://redis.io/docs/latest/develop/programmability/eval-intro/). Models here do not prove Redis failover, distributed ownership or production performance.
