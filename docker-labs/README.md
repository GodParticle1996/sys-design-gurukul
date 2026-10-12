# 🐳 System Gurukul — Docker Projects

Saare tracks ke hands-on projects (43). Har project **zero-dependency Node.js**
hai (sirf `http` aur `fetch`) — chhoti asli services jo failure ko khud dikhati hain. Har README mein **asli run ke
numbers** hain.

| Project | Kya dikhata hai | Level |
|---|---|---|
| [01-reddit](01-reddit/README.md) | Reddit: facts, answers, rank aur cache | Reddit |
| [02-cloudflare](02-cloudflare/README.md) | Cloudflare: anycast, config, early drop, isolates | Cloudflare |
| [03-jira](03-jira/README.md) | Jira: tenants, index drift, permissions | Jira |
| [04-snowflake](04-snowflake/README.md) | Snowflake: compute alag, cache paas, resize lazy | Snowflake |
| [05-airtable](05-airtable/README.md) | Airtable: RAM ki speed, RAM ki chhat, diffs aur dual run | Airtable |
| [06-slack](06-slack/README.md) | Slack: boot, fan-out, hot shard, queue jam | Slack |
| [07-discord](07-discord/README.md) | Discord: partition key, hot partition, live migration | Discord |
| [08-scheduler](08-scheduler/README.md) | Distributed scheduler: leader lock, zombie, idempotency, watchdog | Scheduled Work |
| [09-raft](09-raft/README.md) | Raft (seekhne wala version) | Consensus |
| [10-migration](10-migration/README.md) | Live migration: dual write vs CDC, state vs delta, shadow cutover | Migration |
| [11-ai-containment](11-ai-containment/README.md) | AI agent ko deewar ke andar rakho (containment) | Containment |
| [12-colab](12-colab/README.md) | Google Colab: sandbox ka tax aur GPU ka rashan | Colab · Muft GPU ka rashan |
| [13-stripe](13-stripe/README.md) | Stripe: rewrite nahi, tooling | Sorbet aur selective tests · GIL |
| [14-dropbox](14-dropbox/README.md) | Dropbox Magic Pocket: erasure coding, SMR, aur rent vs own | Dropbox · Erasure coding aur SMR |
| [15-backpressure](15-backpressure/README.md) | Backpressure: line kitni lambi, aur "dheere bhejo" kaun bolega? | Backpressure |
| [16-prime-video](16-prime-video/README.md) | Prime Video: boundary ka tax, aur monolith jo copies se scale hota hai | Prime Video · Monolith jo copies se scale hota hai |
| [17-crowdstrike](17-crowdstrike/README.md) | CrowdStrike: 21 maange, 20 mile, aur 500 machines | Do lanes · Crash domain chhota karo |
| [18-bittorrent](18-bittorrent/README.md) | BitTorrent: 40 log, ek file, aur origin ko aaram | BitTorrent · Kaunsa piece pehle? · Free riders aur tit-for-tat · Tracker ke bina |
| [19-starlink](19-starlink/README.md) | Starlink: satellite har 3 sec badle, SSH phir bhi na toote | Starlink · Har 15 second · Churn ke upar pehchaan |
| [20-aws](20-aws/README.md) | AWS: jab machines crore mein hon, har chhoti aadat ka hisaab | Blast Radius & Cells · Network · Constant work aur chhote databases |
| [21-youtube](21-youtube/README.md) | YouTube: mehenga kaam ek baar, sasta kaam karodon baar | YouTube · Transcode · Vitess · Duniya bhar mein order, aur ISP ke andar video |
| [22-gmail](22-gmail/README.md) | Gmail: "delivered" bolne se pehle kya-kya ho chuka hota hai | Gmail · Durable aur consistent · Mail aana |
| [23-datadog](23-datadog/README.md) | Datadog: 40,000 servers, ek hi minute mein | Postmortem · ip rule · Andhe, band, aur thundering herd |
| [24-google-maps](24-google-maps/README.md) | Google Maps: naksha dheere badalta hai, traffic har minute | Google Maps · Customizable Route Planning · Traffic · Tiles, S2 aur "mere paas kya hai" |
| [25-whatsapp](25-whatsapp/README.md) | WhatsApp: 50 engineers, 90 crore users, aur ek event loop | WhatsApp · 2 lakh se 30 lakh connections · Dakghar · End-to-end encryption |
| [26-google-search](26-google-search/README.md) | Google Search: 0.2 second mein poora web | Google Search · Fan-out · Ranking |
| [27-roblox](27-roblox/README.md) | Roblox: laakhon chhote, phenkne layak servers | Roblox · Matchmaker |
| [28-tiktok](28-tiktok/README.md) | TikTok: 3 swipe mein tumhe pehchaan lena | TikTok · Embedding table · Training example ka safar |
| [29-replit](29-replit/README.md) | Replit Agent: galti karne do, par "undo" button ke saath | Dushman maan ke isolation · Undo button |
| [30-deepseek](30-deepseek/README.md) | DeepSeek: dheemi wire, tez dimaag | DeepSeek · Mixture of Experts · MLA aur FP8 |
| [31-notion](31-notion/README.md) | Notion: sab kuch ek block hai | Permissions · 20 arab se 200 arab |
| [32-replication](32-replication/README.md) | Replication: jo sirf ek hai, wahi poora system hai | Replication har jagah · Replica backup nahi hai |
| [33-cache-invalidation](33-cache-invalidation/README.md) | Cache invalidation: purana price kitni der dikhega? | Cache Stampede · Cache Invalidation |
| [34-consistent-hashing](34-consistent-hashing/README.md) | Consistent hashing: ek node gaya, poora cache nahi | Consistent Hashing |
| [35-connection-pooling](35-connection-pooling/README.md) | Connection pooling: zyada connections = zyada kaam? Bilkul nahi | Connection Pool |
| [36-distributed-locks](36-distributed-locks/README.md) | Distributed locks: taala tha, phir bhi do baar paisa kata | Distributed Locks · Lock kaunsa |
| [37-retries](37-retries/README.md) | Retries: madad bhi, aag mein ghee bhi | Retries |
| [38-circuit-breaker](38-circuit-breaker/README.md) | Circuit breaker: kisko bachata hai, kya ginta hai, aur khulne ke baad kya | Circuit Breaker |
| [39-noisy-neighbor](39-noisy-neighbor/README.md) | Noisy neighbour: ek tenant ka shor, sabki neend kharab | Bulkhead |
| [40-disaster-recovery](40-disaster-recovery/README.md) | Disaster recovery: region gaya, ab kitni der aur kitna data? | Replication har jagah |
| [41-load-balancing](41-load-balancing/README.md) | Load balancing: request kis server par jaaye? | Network |
| [42-chaos](42-chaos/README.md) | Chaos monkey: jaan-boojh kar todo, taaki kami pehle dikhe | Chaos Engineering |
| [43-health-checks](43-health-checks/README.md) | Health checks: "sab theek?" poochhne wala hi sab na gira de | Health Checks 1–5 (Playlist · 1 Resilience) |

```bash
cd docker-labs/09-raft
docker compose --profile ex1-election up --build    # har exercise ek compose profile
npm start ex1-election                              # bina docker (Node 18+)
```

Database ke andar ka hissa (WAL, MVCC, partitioning, asli Postgres/MySQL CDC) **SQL Gurukul** ke
`docker-labs/` mein hai.
