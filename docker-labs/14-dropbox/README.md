# 🐳 Lab 14 — Dropbox Magic Pocket: erasure coding, SMR, aur rent vs own

System Gurukul → 🏢 Company Stories → **Dropbox (600 PB off AWS)** levels ka lab. Zero dependency Node (18+).
`lib/rs.js` asli **Reed-Solomon** erasure coding hai (GF(2⁸), systematic Cauchy matrix) — koi library nahi, ~80 lines.

```bash
npm start ex1-erasure                 # 10 "disks" (4841) — data/disk-0 … disk-9
node tools/durability.js              # dusre terminal mein
node tools/smr.js                     # ex2 — sirf tool
node tools/cost.js --pb 500           # ex3 — sirf tool
docker compose --profile ex1-erasure up --build      # ya Docker se
```

## ex1-erasure — 3 copies vs 6+4 chunks

20 files (har ek 1 MB random data). Har file do tareeke se rakhi:
- **3× replication** — poori file ki 3 copies, 3 alag disks par
- **6+4 erasure coding** — file ke 6 data chunks + 4 parity chunks, 10 alag disks par. **Koi bhi 6** chunks mil jaayein toh file wapas.

Phir disks maaro, saari files padho, SHA-256 milao.

```
20 files × 1 MB = 20.0 MB asli data
  disk par — 3× replication: 60.0 MB (3.00×)   |   6+4 erasure coding: 33.3 MB (1.67×)

disks mare | 3× replication: files bachi | 6+4 erasure coding: files bachi
         1 | 20/20                       | 20/20
         2 | 20/20                       | 20/20
         4 | 16/20                       | 20/20
         5 | 14/20                       |  0/20

ek disk hamesha ke liye gayi — naya disk bharne ke liye network se padhna pada:
  3× replication: 6.0 MB   |   6+4 erasure coding: 20.0 MB  (har khoye chunk ke liye 6 chunks padho)
```

👉 **Jagah:** 60 MB vs 33.3 MB. Hundreds of petabytes par yeh farak = sainkdon petabyte ka hardware jo khareedna hi nahi pada.

👉 **Bachav:** 6+4 koi bhi **4** disks ke marne par bhi har file bacha leta hai. 3 copies wali files tab jaati hain jab
teeno copies wali disks ek saath marein (4 lagataar disks mare → 4 files gayi). Par 6+4 ki bhi hadd hai: **5** disks gaye
→ har file ke sirf 5 chunks bache → **saari** files gayi. Erasure coding "sab ya kuch nahi" jaisa girta hai — isliye Dropbox
chunks ko alag **zones** mein rakhta hai taaki ek saath 5 girna lagbhag namumkin ho.

👉 **Keemat:** ek disk marne par naya disk bharne ke liye erasure coding ne **20 MB** padha, replication ne sirf **6 MB**
(ek copy uthao, likh do). Har khoye chunk ke liye 6 chunks network se laane padte hain + GF(256) ka hisaab. Isliye **garam
(hot)** data replication par, **thanda (cold)** zyadatar data erasure coding par — tiering.

## ex2-smr — shingled disk sirf "likho ek baar" ke liye

```
band = 256 tracks, 10,000 writes
  sequential → har 1 track ke badlaav par 1.0 tracks disk par likhi gayi (write amplification)
  random     → har 1 track ke badlaav par 127.5 tracks disk par likhi gayi (write amplification)
```

👉 SMR tracks ko chhat ke khaprail ki tarah ek-doosre par chadha deta hai → wahi disk zyada data rakhti hai. Par beech ki ek
track badlo toh uske upar chadhi saari tracks dobara likhni padti hain (yahan average 127×). Dropbox ka data **likho ek baar,
kabhi-kabhi padho** — sirf sequential writes → SMR ka nuksaan zero, faayda poora. AWS jaisa general-purpose provider yeh
nahi kar sakta, kyunki uske customers random writes karte hain.

## ex3-cost — kab apna banana sasta?

```
10 PB   → cloud $2.8M / saal   · apna $41.0M / saal  → CLOUD sasta
100 PB  → cloud $28.2M / saal  · apna $50.0M / saal  → CLOUD sasta
500 PB  → cloud $141.0M / saal · apna $90.1M / saal  → APNA sasta: $50.9M / saal bachat
```

⚠️ Yeh **khilona model** hai: cloud = video ke list prices (S3 ~2¢/GB-month, egress ~9¢/GB) × 50% chhoot; apna = $40M/saal
fixed (team, data centers, bijli, network contracts) + hardware. Asli numbers har company ke alag — `tools/cost.js` mein apne
daalo. **Pattern** pakdo: fixed kharcha bada hai, isliye sirf bahut bade, **steady** (elasticity ki zaroorat nahi) workload par
apna sasta padta hai.

## Khud try karo

1. `tools/durability.js` mein `K = 6, M = 4` ko `K = 10, M = 4` karo. Jagah kitni bachi, repair mein kitna padhna pada?
2. Replication ko lagataar disks (`f, f+1, f+2`) ki jagah door-door disks par rakho (`f, f+3, f+6`). 4 disks marne par kya badla?
3. `tools/cost.js --pb 500 --egress 0.05` — download kam ho toh break-even kahan khiska?
