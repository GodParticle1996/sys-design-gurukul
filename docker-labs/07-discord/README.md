# 🐳 Lab 07 — Discord: partition key, hot partition, live migration

```bash
npm start <exercise>
docker compose --profile <exercise> up --build
```

Numbers asli run ke hain (Node 24, ek laptop) — tumhare machine par thode alag aayenge.

---

## ex1-partition-key — load ka batwara vs read ka kharcha

8 nodes, 10,000 channels. Ek "viral" channel ko 45% traffic. Teen partition schemes:
`KEY=channel`, `KEY=hash` (message id se), `KEY=channel-time` (channel + time bucket).

```bash
npm start ex1-partition-key                                   # KEY=channel
node tools/skew.js --hot-share 45 --requests 3000
KEY=hash npm start ex1-partition-key && node tools/skew.js --hot-share 45 --requests 3000
KEY=channel-time BUCKETS=4 npm start ex1-partition-key && node tools/skew.js --hot-share 45 --requests 3000
```

```
KEY=channel       hottest node: 52.4% of load   p99:  571 ms   partitions per read: 1
KEY=hash          hottest node: 12.5% of load   p99: 3489 ms   partitions per read: 8
KEY=channel-time  hottest node: 18.5% of load   p99:  324 ms   partitions per read: 2
```

👉 Hash ne load sabse barabar baanta — par har page ab 8 nodes se merge hota hai, isliye kul
kaam 8 guna aur p99 sabse kharab.

---

## ex2-coalescing — hot partition, retry storm, aur ek query

Ek partition: ek saath sirf 8 queries, har query 80 ms. Teen data-service instances.
3,000 clients ek hi channel ek saath kholte hain; client ka timeout 1.5 s.

```bash
npm start ex2-coalescing                                        # COALESCE=0
node tools/herd.js --clients 3000 --retries 0
node tools/herd.js --clients 3000 --retries 2
COALESCE=1 npm start ex2-coalescing
node tools/herd.js --clients 3000 --retries 2                   # ROUTE=random
ROUTE=hash node tools/herd.js --clients 3000 --retries 2
```

```
ROUTE=random COALESCE=0   retries: 0   db queries: 2,417   p99: 1725 ms   failed: 2920
ROUTE=random COALESCE=0   retries: 2   db queries: 7,505   p99: 9828 ms   failed: 2844     ← retry amplification 3.1×
ROUTE=random COALESCE=1   retries: 2   db queries:     9   p99: 1223 ms   failed:    0   merged: 2,991
ROUTE=hash   COALESCE=1   retries: 2   db queries:     8   p99: 2141 ms   failed:    0   merged: 4,179
```

👉 Asli jeet **coalescing** hai (7,505 → 9 queries). Routing: random par har instance apni query
bhejta hai (yahan 3 instances, isliye farq chhota); 100 instances hote toh random routing
100 guna queries bhejti — isliye Discord channel id par consistent hashing karta hai. (Hash
routing mein sab kuch ek instance par aata hai, isliye yahan uska p99 thoda zyada hai.)

---

## ex3-live-migration — dual writes, checkpointed backfill, compare, promote

`old-store` mein 4,00,000 purane messages hain, aur `writer` 500 naye messages/second likh raha hai.

```bash
npm start ex3-live-migration
node tools/dual-on.js                                   # "abhi" ka data dono jagah
CKPT=0 node tools/backfill.js --kill-at 40              # beech mein maar do
CKPT=0 node tools/backfill.js --kill-at 60              # dobara — shuruaat se
# naya shuru karo (npm start dobara), phir:
node tools/dual-on.js
CKPT=1 node tools/backfill.js --kill-at 40
CKPT=1 node tools/backfill.js                           # checkpoint se resume
node tools/compare.js
node tools/promote.js
```

```
{"dual":true}
recent window: old 1500 msgs · new 1500 msgs · missing 0  ✅ "abhi" sambhal gaya

backfill… 44.7% done (koi checkpoint nahi)
killed
restart → resuming from 0.0%   ⚠️ checkpoint nahi tha — 44.7% kaam DOBARA hoga

backfill… 44.7% done (checkpoint saved at 44.7%)
killed
restart → resuming from 44.7%   ✅ checkpoint se
backfill complete: 2,22,750 rows is run mein copy hue   rate: 5,77,073 rows/s
full compare: old 4,03,150 · new 4,03,200 · missing in new 0  ✅
{"primary":"new-store"}
```

(Backfill ki upper bound = backfill shuru hone ke waqt ka max id. Dual writes pehle se on hain,
isliye uske baad ke messages dono jagah khud pahunch rahe hain — beech mein gap nahi bachta.
`new` ke 50 zyada isliye hain ki compare ke dauraan writer likhta raha.)

---

## Ports

| Kya | Port |
|---|---|
| store (ex1) | 4701 |
| data-service × 3 · partition (ex2) | 4711–4713 · 4714 |
| old-store · new-store (ex3) | 4721 · 4722 |
