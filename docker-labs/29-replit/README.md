# 🐳 Lab 29 — Replit Agent: galti karne do, par "undo" button ke saath

System Gurukul → 🤖 AI Companies → **Replit Agent** levels ka lab. Zero dependency Node (18+).

```bash
npm start ex1-snapshots            # workspace (5071) — asli disk par project + snapshots (./data)
node tools/snapshots.js            # full copy vs copy-on-write blocks, 1 MB aur 200 MB project
node tools/agent.js                # ex2 — no-undo vs rollback vs 3 parallel forks (koi server nahi)
node tools/forkdb.js               # ex3 — forkable DB: fork mein DROP TABLE
docker compose --profile ex1-snapshots up --build
```

## ex1-snapshots — har kadam se pehle "save point"

Project = 200 files. 10 kadam, har kadam 3 files badalta hai + snapshot. 11va kadam: agent ne 5 files tod di → rollback.
`cow` = files 64 KB blocks mein, har block ka naam uska SHA-256; snapshot = sirf "kaunse blocks" ki list; na badli file
dobara hash bhi nahi hoti (dirty tracking).

```
$ node tools/snapshots.js
project   mode   pehla snapshot   10 snapshots ke baad disk   baad ke snapshots (avg)   rollback: time, files likhi, tooti files
   1 MB  full      15.8 ms         9.9 MB                 18.1 ms                17.6 ms, 200 files, 5 → 0
   1 MB  cow       19.3 ms         1.3 MB                  1.9 ms                 4.6 ms,   5 files, 5 → 0
 200 MB  full       324 ms      1973.1 MB                676.4 ms               478.3 ms, 200 files, 5 → 0
 200 MB  cow     1541.6 ms       202.2 MB                  5.7 ms               187.5 ms,   5 files, 5 → 0
```

200 MB project (node_modules jaisa): full copy = har snapshot **676 ms** aur 10 snapshots mein **~2 GB**. CoW: pehla
snapshot mehenga (sab hash karna), uske baad **5.7 ms** aur disk **202 MB** (sirf badle blocks). Snapshot itna sasta ho
tabhi agent **har** kadam se pehle le sakta hai. Rollback bhi sirf badli 5 files likhta hai.

## ex2 — 30 kadam, har kadam mein thoda risk

Tests 80% galtiyan pakadte hain. `no-undo`: pakdi galti ko aage-aage theek karne ki koshish (50% theek, 50% aur bigaad).

```
$ node tools/agent.js
har kadam ka risk   tareeka        poore sahi bane (1000 runs)   wall-clock rounds   compute (steps chalaye)
      5%           no-undo          38.9%                       31.2                31.2
      5%           rollback         71.0%                       31.2                31.2
      5%           rollback+3       74.8%                       30.0                90.0
     15%           no-undo           6.8%                       33.7                33.7
     15%           rollback         32.0%                       33.9                33.9
     15%           rollback+3       35.1%                       30.0                90.1
```

5% risk par bhi no-undo sirf **38.9%** projects sahi — galti ke upar galti. Rollback: **71%**, same compute.
3 parallel forks: retry ka intezaar nahi (rounds 30), par compute **3×** — aur chhupi galtiyan (jo tests nahi pakadte) wahi
ki wahi. Isliye asli limit tests ki hai: rollback utna hi achha jitna "kuch toota?" batane wala test.

## ex3 — forkable database

```
$ node tools/forkdb.js
production users table: 500,000 rows
fork banaya: 0.005 ms, overlay mein 0 rows (kuch copy nahi hua)
agent ne fork mein 3 badlaav kiye → overlay 3 rows | fork: user 7 = pro, user 8 = undefined, prod: user 7 = free, user 8 = user8

Ab agent galti se: "DROP TABLE users" (fork mein)
  fork mein users: 0      production mein users: 500,000  ✅ asli data ko haath bhi nahi laga
```

Fork = sirf apne badlaav ka chhota overlay (writes + tombstones); padhte waqt pehle overlay, phir parent. Banana **muft**
(0.005 ms), aur agent ki sabse buri galti bhi fork tak simit. Achha nikla → review karke overlay prod par lagao.

## Kya seekha

| Sawaal | Jawab lab se |
|---|---|
| Har kadam se pehle backup? | CoW: 676 ms → 5.7 ms, 2 GB → 202 MB |
| Agent galti kare toh | Rollback: 38.9% → 71% projects sahi |
| 3 forks ek saath | Tez (retry ka intezaar nahi) par 3× compute; tests ki limit wahi |
| Agent + production DB | Fork do: DROP TABLE fork mein, prod 500,000 rows safe |
