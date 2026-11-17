# Photo app: predict, run, explain

System Gurukul mein `#level=fp-scale-kab` kholo. Har run se pehle prediction likho. Timer nahi hai. Yeh original, deterministic models hain. Redis, PostgreSQL replication, cloud queues aur real request load run nahi hote.

App folder `/home/vibekdutta/VixiApps/sys-design-gurukul` mein Node se run karo:

```bash
node practical-labs/scaling-decisions/run.cjs traffic
node practical-labs/scaling-decisions/run.cjs cache
node practical-labs/scaling-decisions/run.cjs replica
node practical-labs/scaling-decisions/run.cjs backlog
node practical-labs/scaling-decisions/run.cjs skew
```

| Experiment | Pehle predict karo | Worked result aur reason |
|---|---|---|
| Traffic | 1m users × 30 daily actions, chosen peak 3×: actions/s? | Average 347.22; assumed peak 1041.67; 90% reads 937.50 and 10% writes 104.17. People, actions, SQL queries aur photo bytes alag units hain. |
| Cache | A ne old DB result padha. B ne new value commit karke cache delete ki. Ab A cache fill kare? | DB v2 ke saath cache v1. Delete earlier in-flight read ko cancel nahi karti. Model monotonic version floor=2 old fill reject karta hai. |
| Replica | Two-second primary pin; t=3s par replica still v1; client just wrote v2. | Timer v1 return karega. Required version=2 check primary v2 choose karta hai. Replica t=5s tak lag kar sakti hai. |
| Backlog | 60s × (2000−500) jobs; burst ke baad 200 arrivals/s? | 90,000 queued. Net drain 500−200=300/s. Recovery 300s. Zero arrivals par 180s; 500 arrivals/s par backlog unchanged. |
| Hot key | 10k reads/s, half one post par; baaki evenly spread. Fifth shard enough? | Hot shard 6250→6000 reads/s. Same key ka 5000/s ab bhi one destination par hai. |

Cache model ka atomic floor operation DB transaction ke saath atomic nahi hai. DB commit aur floor update ke gap mein stale reads possible hain. Lost invalidation, floor eviction/restart, concurrent distributed writers, comparison/update atomicity aur recovery is script mein implement nahi hain. Floor ko value TTL ke saath delete kar doge toh late v1 refill possible ho sakta hai. Strict freshness chahiye toh authoritative read/version validation aur failures ka explicit contract design karo. TTL entry ki age limit kar sakti hai; lagging replica se repeated refill DB staleness ko automatically bound nahi karti.

Replica model already-known versions compare karta hai. Real implementation mein per-object version ya suitable commit/apply position, read routing, deadline aur trusted freshness metadata chahiye. Failover par old primary ko write karne se rokna **fencing** hai. Timeout old primary ke marne ka proof nahi. Synchronous acknowledgement ka exact contract bhi check karo: PostgreSQL standby flush aur standby apply different milestones hain.

Ek input badlo, pehle output explain karo:

1. `cache`: `advance(2)` hatao. Old fill reject assertion fail honi chahiye. Why: floor ab bhi 1 hai. Production repair ko invalidation-loss test bhi chahiye.
2. `replica`: replica version 2 karo. Minimum-version rule replica use kar sakta hai. Primary fallback mandatory forever nahi.
3. `backlog`: post-burst arrivals 600/s karo. Backlog har second 100 jobs badhegi. Queue demand remove nahi karti. Capacity, retry traffic, expiry aur acceptable waiting time check karo.
4. `skew`: hot demand 5000→8000 aur background total 5000→2000 karo. Four shards par hot=8500, others=500. Equal key counts equal traffic nahi hain.
5. SQL mechanism khud execute karo: [query plan aur retry-safe counter](../../../sql-gurukul/practical-labs/query-cost/README.md). `COUNT(*)` ka index seek matching rows count karne ka kaam disappear nahi karta.

Interview answer ka worked structure: “Pehle measured bottleneck dekhunga. Repeated eligible reads slow hain toh cache consider karunga, with freshness and cold-start budget. Worker burst hai toh bounded queue aur net-drain calculation. One key hot hai toh shard count alone enough nahi. Har change ke baad latency, errors, cost aur failure behavior retest karunga.”

Further reading: [PostgreSQL acknowledgement settings](https://www.postgresql.org/docs/current/runtime-config-wal.html#GUC-SYNCHRONOUS-COMMIT), [CQRS](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs), [CloudFront cache expiry](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html). Source diagrams and arithmetic motivated the review; learner examples and code are independently authored.
