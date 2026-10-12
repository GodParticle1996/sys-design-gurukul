# 🐳 Lab 09 — Raft (seekhne wala version)

System Gurukul → 🌐 Distributed Systems → **Consensus** aur **Consensus — network do tukde** levels ka lab.

`services/raft-node.js` ek chhota Raft hai: terms, RequestVote, AppendEntries, quorum commit,
random election timeouts (300–600 ms), heartbeat har 80 ms. Paanch alag processes, HTTP par baat.
**Production ke liye nahi** — production mein etcd / ZooKeeper / KRaft use karo.

```bash
npm start ex1-election            # ya ex2-quorum-partition (wahi 5-node cluster)
docker compose --profile ex1-election up --build
```

Numbers asli run ke hain (Node 24, ek laptop).

---

## ex1-election — leader maaro, aur timeouts barabar karke dekho

```bash
npm start ex1-election
node tools/election.js

SAME_TIMEOUT=1 npm start ex1-election
SAME_TIMEOUT=1 node tools/election.js
```

```
pehla leader: node 3 (term 1)
  node 3 maara → node 1 leader  347 ms mein   (term +1)
  node 1 maara → node 2 leader  407 ms mein   (term +1)
  node 2 maara → node 3 leader  414 ms mein   (term +1)
RANDOM timeouts → average failover: 389 ms

(SAME_TIMEOUT=1)
10 s mein KOI leader nahi bana — term 21 tak pahunch gaye, kul 105 elections (har baar vote bant gaye)
SAME timeouts → sab ek saath candidate, sab khud ko vote, kisi ko majority nahi ❌
```

👉 Random timeout ek chhoti si chaal hai — uske bina cluster **khud ko hi rok** leta hai.

---

## ex2-quorum-partition — majority ke bina commit nahi

```bash
npm start ex2-quorum-partition
node tools/quorum.js
node tools/partition.js
```

```
leader: node 3 (term 1)
  5/5 zinda                    → x=1: committed ✅ (6 ms)
  2 followers band (3/5 zinda) → x=2: committed ✅ (5 ms)
  3 followers band (2/5 zinda) → x=3: COMMIT NAHI ❌ — majority ka ack nahi mila (timeout)

leader: node 3 (term 1)   partition → {3,1} | {2,4,5}
  minority: node 3 par y=20 → COMMIT NAHI ❌
  majority: naya leader node 5 (term 2)
  majority: node 5 par y=30 → committed ✅
  partition ke dauraan khud ko leader maanne wale: node 3 (term 1), node 5 (term 2)
heal ke baad har node ka log:
  node 1..5: x=1, x=2, x=3, y=30
```

👉 Do cheezein dhyan se dekho:

1. Partition ke dauraan **do nodes khud ko leader maante the** — par sirf term 2 wala commit kar
   saka. Heal hote hi node 3 ne bada term dekha, follower bana, aur uncommitted `y=20` phenk diya.
2. `x=3` us waqt commit nahi hua tha (client ko timeout mila) — par followers wapas aaye toh woh
   replicate hokar **baad mein commit ho gaya**. Isliye client ki retry **idempotent** honi chahiye:
   "timeout" ka matlab "fail" nahi, "pata nahi" hota hai.

---

## Ports

| Kya | Port |
|---|---|
| raft-node 1 … 5 | 4901 … 4905 |
