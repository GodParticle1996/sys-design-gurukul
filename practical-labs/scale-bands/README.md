# Scale bands: unit, cost aur downstream limit — predict, run, explain

System Gurukul mein `#level=napkin` aur `#level=chooser` kholo. Har run se pehle prediction likho. Yeh arithmetic models hain; numbers chosen hain, measured nahi. Koi database, Lambda, queue ya CDN run nahi hota.

App folder (`sys-design-gurukul`) mein:

```bash
node practical-labs/scale-bands/run.cjs           # saare 5
node practical-labs/scale-bands/run.cjs units
node practical-labs/scale-bands/run.cjs cost
node practical-labs/scale-bands/run.cjs bytes
node practical-labs/scale-bands/run.cjs lambda
node practical-labs/scale-bands/run.cjs retries
```

| Experiment | Pehle predict karo | Worked result aur reason (2026-11-16 run) |
|---|---|---|
| units | 47.7M SQS messages/s = kitne DB queries/s? | Ratio 0 → 0; 0.5 → 23.9M; 2 → 95.4M. Ratio pata nahi, isliye source slide ka "= 40M QPS" nikal nahi sakta. |
| cost | 16 cores, 500 QPS: 2 ms query vs 200 ms query? | 2 ms: 1 core busy (6%), ceiling ~8,000 QPS. 200 ms: 100 cores chahiye, ceiling ~80 QPS. Dono "medium" band. |
| bytes | 1,000 viewers, 2.5 MB segment har 4 s: requests/s aur bandwidth? | 250 req/s, par 625 MB/s = 5 Gbps. Bandwidth design tay karti hai. |
| lambda | 4,000 req/s × 0.2 s, har function ek DB connection; limit 100? | 800 functions, 700 connections refused. Pool/proxy ke saath DB time 20 ms → ~80 busy (pool 90). Cap 300 functions → 1,500 req/s chalte hain, baaki throttle/queue. |
| retries | 87.5% fail, 3 client retries: offered load? | ~13,242 req/s for 4,000 asli req/s (fail share same maan ke). |

Model ki seemayein: concurrency aur busy cores averages hain (Little's law, utilization law). Bursts, lock waits aur slow queries pool ko bhar dete hain. PostgreSQL ke kuch connections superuser ke liye reserved hote hain. Lambda ke asli scaling rules aur quotas region aur account par depend karte hain; docs dekho.

Ek input badlo, pehle output explain karo:

1. `lambda`: `dbSeconds` 0.02 → 0.05. Busy connections? (200 > 90: pool line banayega.)
2. `cost`: cores 16 → 64. Query B ka ceiling? Kya 500 QPS ab chalega?
3. `bytes`: segment 2.5 MB → 0.6 MB (kam bitrate). Gbps kitna?
4. `retries`: `retries` 3 → 0. Offered load?

Interview line: "Peak ~4,000 req/s, har request 0.2 s → ~800 concurrent functions. DB 100 connections leta hai, isliye pool + concurrency cap + queue. Band ka naam is hisaab ke baad."

Sources: [AWS — Prime Day 2021 (SQS 47.7M messages/s)](https://aws.amazon.com/blogs/aws/prime-day-2021-two-chart-topping-days), [Lambda scaling behavior](https://docs.aws.amazon.com/lambda/latest/dg/burst-concurrency.html), [Lambda quotas](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html), [PostgreSQL max_connections](https://www.postgresql.org/docs/current/runtime-config-connection.html). Learner examples aur code independently likhe gaye hain.
