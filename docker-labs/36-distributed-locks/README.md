# 🐳 Lab 36 — Distributed locks: taala tha, phir bhi do baar paisa kata

System Gurukul → 🌐 Distributed → **Distributed Locks / Lock Choices** levels ka lab. Zero dependency Node (18+).
(TTL leader lock + zombie leader ka scheduler wala roop: lab 08. Postgres/MySQL ke advisory locks: 🐘 SQL Gurukul lab **10-advisory**.)

```bash
npm start ex1-fencing        # 5 lock servers (5151–5155, Redlock ke liye) + ledger (5156)
node tools/pause.js          # GC pause: single lock vs Redlock vs fencing token
node tools/herd.js           # 100 waiters: sabko jagao vs line mein agla
docker compose --profile ex1-fencing up --build
```

`lockd` = Redis ke `SET key owner NX PX ttl` jaisa, aur har acquire par ek badhta number (**fencing token**).
`ledger` = asli side effect (payment). `FENCING` on ho toh har order ka ab tak ka sabse bada token yaad rakhta hai aur
purane token wala charge **mana** karta hai.

## ex1-fencing — GC pause

Har order: worker A lock leta hai (TTL 300 ms), phir **600 ms GC pause**. Lock khud expire → worker B lock leta hai, charge karta
hai. A jaagta hai — use lagta hai lock abhi bhi uska hai — aur charge karta hai.

```
$ node tools/pause.js
lock                     ledger fencing check   orders   DOUBLE CHARGE   ledger ne purane token reject kiye
single                   nahi                     30         30          0
redlock (5 nodes)        nahi                     30         30          0
single + fencing token   haan (token)             30          0          30
```

- **Single lock**: 30/30 orders par **do baar paisa**. Lock "waqt" par chalta hai; A ki process ruki thi, use pata hi nahi chala ki waqt beet gaya.
- **Redlock** (5 mein se 3 ki majority): phir bhi **30/30**. Dikkat lock server ki nahi thi — dikkat A ke pause ki hai. Kitne bhi
  lock servers laga lo, rukha hua client jaag ke purane bharose par kaam karega.
- **Fencing token**: har lock ke saath badhta number; **ledger** (jise bachana hai) chhota number aaye toh mana kare → **0 double charge**.
  (Redlock mein 5 alag counters — ek bharosemand token hota hi nahi. Correctness chahiye toh ZooKeeper/etcd jaisa consensus
  wala lock jo token deta hai, ya DB ka apna row lock / advisory lock.)

## ex1 (dusra tool) — 100 waiters, ek lock

```
$ node tools/herd.js
style    lock handoffs   total wake-ups   bekaar jaagna (jaage par lock nahi mila)
all           100            5050          4950
queue         100             100          0
```

- **all** (lock chhoota → sabko khabar): har release par bachi hui poori bheed lock server par toot padti hai, ek jeetta hai,
  baaki so jaate hain → **5,050 wake-ups** (~N²/2).
- **queue** (ZooKeeper ke sequential nodes jaisa: har koi sirf apne se pehle wale ko dekhta hai) → har release par ek hi jaagta
  hai → **100**.

## Kya seekha

| Sawaal | Jawab lab se |
|---|---|
| TTL lock kaafi hai? | Pause ke saath nahi — 30/30 double charge |
| Zyada lock servers (Redlock)? | Phir bhi 30/30 — pause client mein hai |
| Asli bachaav | Fencing token, jo **resource** check kare → 0 |
| Bahut saare waiters | Queue: 5,050 → 100 wake-ups |
