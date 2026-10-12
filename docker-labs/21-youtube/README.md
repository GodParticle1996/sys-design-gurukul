# 🐳 Lab 21 — YouTube: mehenga kaam ek baar, sasta kaam karodon baar

System Gurukul → 🌍 Planet-scale Infra → **YouTube** levels ka lab. Zero dependency Node (18+).

```bash
npm start ex1-upload                      # upload edge (4961) — link average 30 MB par toot-ta hai
node tools/upload.js                      # blob vs chunked, 5 trials
node tools/upload.js --mb 256 --trials 1  # badi file
node tools/transcode.js                   # ex2 — asli processes, asli CPU burn (koi server nahi)
npm start ex3-vttablet                    # db (4971, max_connections=500) + vttablet (4972, pool=20)
node tools/clients.js --via direct        # 2,000 app connections seedha DB par
node tools/clients.js --via vttablet
node tools/truetime.js                    # ex4
docker compose --profile ex1-upload up --build       # ya Docker se (profiles: ex1-upload, ex3-vttablet)
```

## ex1-upload — resumable chunks vs ek blob

Edge har connection ke liye ek random "maut ka point" chunta hai (average 30 MB) — mobile link jaisa. SHA-256 se poori file verify hoti hai.

```
$ node tools/upload.js
64 MB file, link average ~30 MB par toot-ta hai.  "link par gaye" = server tak sach mein pahunche bytes (adhoore bhi)
#1 blob     requests  14   link toota  13 baar   link par gaye  419 MB (6.5x)   time 5.3 s   sha256 MATCH ✅
#1 chunked  requests  19   link toota   3 baar   link par gaye   68 MB (1.1x)   time 0.9 s   sha256 MATCH ✅
#2 blob     requests   2   link toota   1 baar   link par gaye   78 MB (1.2x)   time 1.0 s   sha256 MATCH ✅
...
average:
  blob     link par 209 MB (3.3x file)   2.7 s   6.2 baar toota
  chunked  link par 67 MB (1.0x file)   0.9 s   2.0 baar toota

$ node tools/upload.js --mb 256 --trials 1
#1 blob     requests  40   link toota  40 baar   link par gaye 1032 MB (4.0x)   time 12.8 s   sha256 nahi mila ❌
#1 chunked  requests  73   link toota   9 baar   link par gaye  275 MB (1.1x)   time 7.6 s   sha256 MATCH ✅
```

64 MB: blob average **3.3× bytes**, aur har baar alag (kabhi 1.2×, kabhi 6.5× — user ko kuch samajh nahi aata).
Chunked hamesha **1.0–1.1×**. 256 MB par blob **40 koshish mein bhi poora nahi hua** — 4 MB ke tukdon ne 7.6 s mein kar diya.
`GET /have/:id` = "kaunse tukde pahunch gaye" → app band karke kal phir shuru karo, wahin se chalega.

## ex2 — 12 machines par ek movie

2 ghante ki movie = 7,200 units (1 unit = 1 second video). Har unit ka asli CPU burn. 10-minute chunks → 12 chunks, alag processes.
Encoder shuru hone par pehle 5 units kachhi quality ke (rate control warm nahi) → **seam glitch**. Overlap = pichhle 5 units bhi
encode karo, phir kaat do.

```
$ node tools/transcode.js                                        # 14-core laptop
encoder        machines  chunks   overlap   wall time   CPU kul    kharab units (seams)   extra encode
H.264              1       1        0        2.20 s     2.17 s        5 / 7200          +0 units
H.264              4      12        0        0.58 s     2.18 s       60 / 7200          +0 units
H.264             12      12        0        0.25 s     2.42 s       60 / 7200          +0 units
H.264             12      12        5        0.24 s     2.33 s        5 / 7200          +55 units
VP9 (~5x CPU)      1       1        0       10.84 s    10.81 s        5 / 7200          +0 units
VP9 (~5x CPU)     12      12        5        1.09 s    11.92 s        5 / 7200          +55 units
```

12 machines = **8.8× tez** (2.20 → 0.25 s), CPU kul lagbhag wahi. Bina overlap ke har seam par 5 kharab units → **60**;
overlap ke saath sirf **5** (movie ki sabse pehli shuruaat, jiske pehle kuch hai hi nahi) — kharcha sirf **+0.8%** encode.
VP9 ~5× CPU (video ke mutabik) — isi liye Google ne Argos VCU chip banaya (~20–33× efficiency, video ke mutabik).

## ex3-vttablet — 2,000 app connections, ek MySQL

DB: `max_connections=500`, har connection 1 MB (asli Buffer → RSS mein dikhta hai), query 20 ms.
Sab clients ek hi viral video ki query maar rahe hain (5 baar har ek).

```
$ node tools/clients.js --via direct
via=direct  2000 clients × 5 same SELECT = 10000 queries  (0.1 s)
  app ko jawab: 2400 ok, 7600 error (E Too many connections)   latency p50 21 ms p99 36 ms
  DB: peak connections 500, refused 1520, queries chali 2400, RSS 570 MB
  intern ki query (bina LIMIT): jawab mila in 2001 ms  → DB par slow queries 1

$ node tools/clients.js --via vttablet
via=vttablet  2000 clients × 5 same SELECT = 10000 queries  (0.2 s)
  app ko jawab: 10000 ok, 0 error    latency p50 31 ms p99 38 ms
  DB: peak connections 20, refused 0, queries chali 6, RSS 69 MB
  vttablet: consolidated 9994 (DB tak gaye hi nahi), pool 20
  intern ki query (bina LIMIT): jawab mila in 21 ms  → DB par slow queries 0 (vttablet ne LIMIT 10000 joda: 1)

$ CONSOLIDATE=0 …   # sirf pool, dedup band
  10000 queries (10.3 s)   latency p50 2048 ms   DB queries 10000
```

- **Pooling**: 2,000 app connections → DB par **20**. RSS 570 MB → 69 MB. "Too many connections" wale 7,600 errors → **0**.
- **Consolidation**: same SELECT pehle se chal raha hai → 10,000 requests, DB par sirf **6 queries**. Band kar do (`CONSOLIDATE=0`)
  → wahi kaam 10.3 s aur p50 **2 sec** (20 pool connections ki line).
- **Safety**: bina LIMIT wali `SELECT * FROM comments` DB ko 2 sec block karti hai; vttablet `LIMIT 10000` jod deta hai → 21 ms.
  (1 sec se lambi query ho toh vttablet use kill bhi karta hai.)

## ex4 — TrueTime: order par duniya bhar ki sehmati

```
$ node tools/truetime.js
10000 jode (T1 phir T2, alag DCs)

tareeka                                  order ulta (violations)   har write par extra wait
NTP ghadi, seedha timestamp                3973 (39.7%)            0
NTP ghadi, chhoti skew (±10 ms)            1398 (14.0%)            0
TrueTime (±7 ms) + commit wait                0 (0.0%)            14.0 ms
NTP-size ε (±50 ms) + commit wait             0 (0.0%)            100.0 ms

Misaal: T1 (Frankfurt) ts=1369.9, T2 (Mumbai) ts=1359.7 — asli mein T2 16.5 ms BAAD hua,
        par timestamp kehta hai PEHLE. Snapshot ts=1364.8 par: photo dikhi, ex abhi bhi ACL mein.
```

Ghadi ki galti jitni badi, utne zyada ulte order. Spanner ka jawab: TrueTime interval `[earliest, latest]` + **commit wait** —
uncertainty (2ε) khatam hone tak commit ko "done" mat bolo. ε chhoti chahiye → **atomic clock + GPS** har DC mein.
NTP-size ε ke saath bhi correctness milti hai, par har write **100 ms** mehenga.

## Kya seekha

| Sawaal | Jawab lab se |
|---|---|
| Kamzor link par bada upload | Chunks + resume: 3.3× bytes → 1.0×, 256 MB blob toh kabhi poora hi nahi hua |
| 2-ghante ki movie jaldi | 12 machines = 8.8× tez; seams ke liye overlap (+0.8% CPU, 60 → 5 kharab units) |
| Hazaron app connections, ek DB | vttablet: pool 20, consolidation 10,000 → 6 queries, LIMIT guard |
| Duniya bhar mein order | TrueTime + commit wait: 39.7% → 0% violations, keemat 14 ms per write |
