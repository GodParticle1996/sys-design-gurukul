# 🐳 Lab 06 — Slack: boot, fan-out, hot shard, queue jam

```bash
npm start <exercise>
docker compose --profile <exercise> up --build
```

Numbers asli run ke hain (Node 24, ek laptop) — tumhare machine par thode alag aayenge.

---

## ex1-boot-payload — snapshot, lazy, aur lazy + injection

20,000 users ka workspace. Har client boot karke 30 recent messages padhta hai, har message
kisi user ko mention karta hai.

* `BOOT=full` — poora snapshot (har user, har channel)
* `BOOT=lazy` — khaali boot; client har anjaan user ke liye alag `/user` call karta hai
* `BOOT=inject` — khaali boot; events ke saath missing profiles pehle se jude hote hain (Flannel)

```bash
npm start ex1-boot-payload                          # BOOT=full
node tools/boot.js --clients 1
node tools/boot.js --clients 200                    # reconnect storm
BOOT=lazy npm start ex1-boot-payload   && node tools/boot.js --clients 200
BOOT=inject npm start ex1-boot-payload && node tools/boot.js --clients 200
```

```
BOOT=full   clients: 1     payload/client: 2.78 MB   extra lookups/client: 0    p99 boot:    88 ms
BOOT=full   clients: 200   payload/client: 2.78 MB   p99 boot: 14150 ms   failed boots: 86   core sent: 556.4 MB
BOOT=lazy   clients: 200   payload/client: 0.00 MB   extra lookups/client: 30   p99 boot: 2939 ms   core requests: 6396
BOOT=inject clients: 200   payload/client: 0.00 MB   extra lookups/client: 0    p99 boot:  367 ms   core requests:  400
```

👉 Lazy akela bada payload ko **hazaron chhoti requests** mein badal deta hai. Injection ke saath
hi dono faayde milte hain.

---

## ex2-fanout-presence — kisko bhejo, kahan copy banao, crash ke baad kya

`edge-sim` 2,000 clients ke inbox rakhta hai (3 regions). Channel `general` ke 300 members hain.
Channel server message pehle `data/pending.json` mein likhta hai (store), phir bhejta hai (send).

```bash
npm start ex2-fanout-presence                                  # FANOUT=broadcast EDGE=0
node tools/fanout.js --messages 5
FANOUT=subs EDGE=1 npm start ex2-fanout-presence && node tools/fanout.js --messages 5
node tools/crash-mid-fanout.js                                 # edge-sim chalu hona chahiye
PRESENCE=all node tools/presence.js --users 2000
PRESENCE=visible node tools/presence.js --users 2000
```

```
FANOUT=broadcast EDGE=0   delivered: 10,000   bekaar (non-members): 8,500   long-haul copies: 10,000   time: 19253 ms
FANOUT=subs      EDGE=1   delivered:  1,500   bekaar (non-members):     0   long-haul copies:     15   time:   379 ms

💥 channel-server crashed after 120/300 deliveries
restart → 1 adhoore message(s) replay ho rahe hain
final delivered: 300/300   lost: 0   duplicate deliveries (client ne dedupe kiye): 120

PRESENCE=all      status badlav: 6000   events sent: 12,36,000
PRESENCE=visible  status badlav: 6000   events sent:  2,58,000
```

(presence wala tool ek formula-simulation hai: har user ko ~206 log dekh sakte hain, par ek
screen par ~25 log hi dikhte hain.)

👉 Replay buffer at-least-once deta hai: **kuch bhi nahi khoya**, aur duplicates client ne id se hata diye.

---

## ex3-hot-shard — formula routing vs mapping layer

8 shards, har shard ek saath 4 queries. 200 chhote workspaces + ek "monster" jo sabse zyada
traffic bhejta hai.

```bash
npm start ex3-hot-shard                                        # ROUTING=code
node tools/shard-load.js --for 3
node tools/rehash.js --to 16
node tools/split-tenant.js                                     # code routing mein mumkin nahi

ROUTING=layer npm start ex3-hot-shard
node tools/split-tenant.js --tenant monster --into 4
node tools/shard-load.js --for 3
```

```
ROUTING=code  hottest shard: 62% of load   monster p99: 477 ms   others p99: 467 ms
   per-shard queries: 197 · 197 · 216 · 2397 · 215 · 216 · 197 · 215
hash % 8 → hash % 16: 23% rows ka thikana badal gaya  (poora data migration chahiye)
❌ code routing mein split ke liye application code badalna padega

mapping updated: channels 0-24 → shard-3, 25-49 → shard-5, 50-74 → shard-6, 75-99 → shard-7
rows moved: 2,47,500   app code changed: 0 lines
ROUTING=layer hottest shard: 20% of load   monster p99: 18 ms   others p99: 18 ms
```

(`others p99` bhi code mode mein kharab hai kyunki shard-3 par monster ke padosi bhi baithe hain.)

---

## ex4-queue-jam — 2016 wala jam, chhote paimane par

In-memory queue ki seema 4,000 jobs. Database 6× slow hai, jobs 400/s aa rahe hain.

* `DEQUEUE_COST=1` — job nikaalne ke liye bhi ek "memory slot" chahiye
* `DEQUEUE_ON=1` — nikaalna O(n) (queue jitni lambi, utna dheema)
* `DURABLE=1` — queue ke aage disk-backed log; bridge tabhi aage deta hai jab jagah ho

```bash
npm start ex4-queue-jam                                         # dono bugs on
node tools/jam.js --rps 400 --for 20 --slow-db 6
DEQUEUE_ON=0 DEQUEUE_COST=0 npm start ex4-queue-jam && node tools/jam.js --rps 400 --for 20 --slow-db 6
DURABLE=1 npm start ex4-queue-jam && node tools/jam.js --rps 400 --for 20 --slow-db 6
```

```
in-memory   accepted: 4,987   REJECTED: 3,013   memory queue: 4,000/4,000
   drain rate: 80/s shuru mein → 0/s aakhir mein   jammed pops: 6,127 (nikaalne ki jagah nahi)  ❌ dono taraf se jam
   DB theek hone ke baad: backlog abhi bhi 4000 (60 s baad)

in-memory   accepted: 5,572   REJECTED: 2,428   memory queue: 3,920/4,000          (O(1) pop, pop ko memory nahi chahiye)
   drain rate: 80/s → 83/s
   DB theek hone ke baad: backlog khaali in 9 s

DURABLE=1   accepted: 8,000   REJECTED: 0   memory queue: 2,125/4,000   log backlog (disk): 4,228
   drain rate: 80/s → 82/s
   DB theek hone ke baad: backlog khaali in 14 s
```

👉 Pehli line wahi 2016 hai: DB theek hone ke **baad bhi** queue khud se nahi khulti.
Doosri line mein jam khul gaya par jobs phir bhi gire (RAM bhari). Teesri line mein kuch nahi gira.

---

## Ports

| Kya | Port |
|---|---|
| workspace (ex1) | 4601 |
| channel-server · edge-sim (ex2) | 4603 · 4604 |
| shard-router (ex3) | 4607 |
| job-queue (ex4) | 4608 |
