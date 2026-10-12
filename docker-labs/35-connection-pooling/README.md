# 🐳 Lab 35 — Connection pooling: zyada connections = zyada kaam? Bilkul nahi

System Gurukul → 💾 Data → **Connection Pooling** level ka lab. Zero dependency Node (18+).
(Asli Postgres par `pgbench` ke saath yahi sweep + backend memory: 🐘 SQL Gurukul lab **09-pooling**. Pooling + query
consolidation ka YouTube/Vitess wala roop: lab 21.)

```bash
npm start ex1-pool                                              # db (5131) + pooler (5132)
node tools/clients.js --via pooler --load busy --pool 16        # closed loop (pgbench jaisa) — pool size badal ke dekho
node tools/clients.js --via db                                  # 1,000 mostly-idle clients seedha DB par
node tools/clients.js --via pooler --pool 32                    # transaction pooling
node tools/clients.js --via pooler --mode session --pool 32     # session pooling
docker compose --profile ex1-pool up --build
```

DB model: har connection = ek backend process, **2 MB** memory (asli Buffer), `max_connections = 500`. **8 cores**, ek query
2 ms CPU. 8 se zyada queries ek saath → cores baantne padte hain + lock/context-switch ka kharcha (har extra active query par 3%).

## ex1-pool (A) — pool size sweep: 200 clients, bina ruke (closed loop)

```
pooler transaction pool=4    tx/sec   529   p50   372 ms  p99   381 ms   DB conns   4, ek saath queries 4
pooler transaction pool=8    tx/sec   995   p50   194 ms  p99   226 ms   DB conns   8, ek saath queries 8
pooler transaction pool=16   tx/sec  1490   p50   131 ms  p99   138 ms   DB conns  16, ek saath queries 16
pooler transaction pool=64   tx/sec   502   p50   384 ms  p99   432 ms   DB conns  64, ek saath queries 64
pooler transaction pool=256  tx/sec   186   p50  1011 ms  p99  1309 ms   DB conns 200, ek saath queries 200
```

Throughput ka **pahaad**: 4 → 16 tak badhta hai, phir **girta** hai. 16 connections (= 2 × cores) par peak 1,490 tx/s;
200 connections par **186** — 8× kam, sirf isliye ki sab ek saath cores aur locks ke liye lad rahe hain.
Isi liye HikariCP/PgBouncer ki salah: pool ≈ `cores × 2 + disks`, "jitna bada utna accha" nahi.
(pool=8 par 1,333 ki jagah 995 kyunki BEGIN/COMMIT ke round trips mein bhi connection pakda rehta hai, CPU khaali.)

## ex1-pool (B) — 1,000 mostly-idle clients (asli apps aise hi hote hain)

Har client 0–2 sec idle, phir BEGIN → 3 × (query + 5 ms app ka kaam) → COMMIT. 8 sec.

```
seedha DB                    tx/sec   450   p50  22 ms  p99 142 ms   clients served  500/1000 (refused 500)   DB conns 500 (≈1000 MB)
pooler transaction pool=32   tx/sec   905   p50  23 ms  p99  33 ms   clients served 1000/1000 (refused 0)     DB conns  32 (≈64 MB)
pooler session pool=32       tx/sec    30   p50  24 ms  p99 173 ms   clients served   32/1000                  DB conns  32 (≈64 MB)
```

- **Seedha DB**: 500 ke baad "too many connections" → **aadhe clients bahar**, aur 500 idle connections ~1 GB memory kha gaye.
- **Transaction pooling**: server connection sirf transaction bhar ke liye → 1,000 clients **32 connections** mein, 64 MB,
  dugna throughput, p99 33 ms.
- **Session pooling** (client jab tak juda, connection uska): 32 clients ne 32 connections pakad liye aur **idle baithe rahe** →
  baaki 968 ko kuch nahi mila. (Session mode tab chahiye jab app session-level cheezein use kare: prepared statements,
  `SET`, temp tables, advisory locks — transaction mode unhe tod deta hai.)

## Kya seekha

| Sawaal | Jawab lab se |
|---|---|
| Pool kitna bada? | Peak ~2 × cores: 16 → 1,490 tx/s, 200 → 186 tx/s |
| 1,000 app connections | Pooler: 500 refused → 0, 1 GB → 64 MB |
| Transaction vs session mode | Transaction: 1000/1000 served; session: 32/1000 (idle log connection pakde baithe) |
