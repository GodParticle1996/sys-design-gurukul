# Design review: pehle predict, phir run

Short-link design ko project debugging aur interview dono ke liye practice karo. Countdown nahi hai. Har step ke baad ruk sakte ho. Notes saamne rakhna allowed hai.

App: [Success 4 — choices and design review](../../index.html#level=sds-contracts-kab). Commands `sys-design-gurukul` folder mein Node.js 24+ se run karo. Existing lab actual SQLite use karti hai; HTTP server, cloud account aur Docker nahi chahiye.

## 1. User promise likho

User short link create karke immediately share karega. Is exercise mein `201 Created` ke baad redirect usable hona chahiye. Explain karo:

- Feature: create link, then redirect.
- Proposed quality target: at 500 redirects/second, client-observed successful redirect p95 ≤ 200 ms. Errors/timeouts separately count honge. **Chosen target hai; achieved benchmark nahi.**
- Scope: analytics immediate redirect ko block nahi karegi. Real product mein abuse controls, permissions, expiry aur acceptable error/recovery targets separately agree karo.

Apna prediction likho: job saved hai lekin mapping absent hai. Redirect ko `302` milega ya `404`?

```bash
node practical-labs/async-contracts/run.cjs early
node practical-labs/async-contracts/run.cjs sync
node practical-labs/async-contracts/run.cjs pending
```

Worked result: `early` reports `201` but immediate redirect gives `404`. `sync` commits the mapping before `201`; primary read gives `302`. `pending` gives `202` and a job status; worker completion makes the link usable. The outputs are HTTP-style objects, not HTTP network measurements. None of these commands tests the 500 requests/second target.

## 2. One request draw karo

```text
Client --create(abc, menu)--> Link API --commit mapping--> Primary DB
Client <--201, /s/abc------ Link API <-----committed------ Primary DB
Client --GET /s/abc-------> Link API --read abc---------> Primary DB
Client <--302, menu------- Link API <-----menu----------- Primary DB
```

Overview mein three responsibilities enough hain. Actual implementation mein HTTP handler, database driver and connection management hote hain. Diagram external clients ko database credentials dene ka instruction nahi.

Change one requirement: redirect ab a lagging replica se reads leta hai. Primary commit alone immediate visibility guarantee nahi karta. Choose primary reads, suitable consistency coordination or bounded wait, and explain the cost. **This lab does not simulate a replica.**

## 3. Collision aur failure inspect karo

```bash
node practical-labs/async-contracts/test.cjs
node practical-labs/async-contracts/run.cjs retry
```

Test file mein `Collision must not overwrite an existing mapping` assertion khojo. Second `abc` with a different destination is rejected; original destination remains. This verifies the database boundary. The lab accepts a supplied code; it does not implement random generation or automatic collision retries.

Change-it-yourself exercise: [store.cjs](../async-contracts/store.cjs) ke `Shortener.createNow()` ko a separate scratch caller se call karo. Candidates `abc, abc, def` do. First link `abc` par banao. Second link ke liye `abc` conflict handle karke `def` try karo. Maximum attempts define karo. Existing mappings overwrite mat karo. Expected final state: first destination at `abc`, second at `def`. Never retry arbitrary database failures as though all were collisions.

The existing test also exits two owned child processes: one during the mapping transaction, one after the analytics consumer committed but before sender acknowledgement. Inspect the assertions: partial work rolls back; retried event does not increment the consumer twice. `retry` shows the acknowledgement gap without killing a process. These tests are not power-cut, cloud-broker or multi-worker proofs.

## 4. Rate ka counted work aur window naam do

Source scenario: 10,000 participants, 20 submissions each, 20 test cases per submission, one two-hour contest. Source's earlier requirement slide states the two-hour duration. A later slide labels 7,200 as seconds/day; use **seconds/contest** here.

Pehle estimate likho. Phir calculator run karo:

```bash
node - <<'NODE'
const submissions = 10000 * 20;
const casesPerSubmission = 20; // Change to 40 for the second experiment.
const caseExecutions = submissions * casesPerSubmission;
for (const [window, seconds] of [['contest: 2 hours', 7200], ['whole day', 86400]]) {
  console.log({window, submissionsPerSecond: (submissions / seconds).toFixed(2),
    caseExecutionsPerSecond: (caseExecutions / seconds).toFixed(2)});
}
NODE
```

| Window | Submissions/s | Case executions/s |
|---|---:|---:|
| Two-hour contest | 27.78 | 555.56 |
| Whole day | 2.31 | 46.30 |

Forty cases per submission gives **27.78 submissions/s and 1,111.11 cases/s during the contest**. Submission traffic did not double; internal work did. All values are averages, not peaks. Compilation, result polling, retries and other requests are excluded. Do not turn 556 case executions/s into 556 servers: per-case cost, bursts, memory limits and measured worker capacity are still missing.

## 5. One decision aloud explain karo

Worked answer:

> User link immediately share karega. Main mapping commit hone ke baad created response dunga, aur redirect initially primary se read karega. Cost: client commit ka wait karega. Collision existing link overwrite nahi karegi. Main chosen load par latency aur errors measure karunga. Agar target miss hua toh trace se bottleneck find karunga. Replica ya cache add karte waqt freshness aur failure tests repeat karunga.

Self-review: kya answer mein user result, measurable target, read/write path, one failure and a tradeoff clear hain? Missing point ko notes mein add karo. This is a practice aid, not an employer's hiring rubric or a promised interview outcome.

Failure follow-up: a replica can copy an accidental DELETE. A replica is not automatically a historical backup. PostgreSQL [standby documentation](https://www.postgresql.org/docs/current/warm-standby.html) describes replication/failover limits; [point-in-time recovery](https://www.postgresql.org/docs/current/continuous-archiving.html) uses a base backup and required transaction-log history. Those are documentation-based decisions; this exercise does not run PostgreSQL failover or restore.

Source context: [System Design School — 10 interview mistakes](https://www.youtube.com/watch?v=15sgUqScHgs). Source diagrams prompted the review questions; exercises and diagrams here are independently authored.
