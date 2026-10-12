# 🐳 Lab 08 — Distributed scheduler: leader lock, zombie, idempotency, watchdog

System Gurukul → 🌐 Distributed Systems → **Scheduled Work** level ka lab.

```bash
npm start <exercise>
docker compose --profile <exercise> up --build
```

Numbers asli run ke hain (Node 24, ek laptop).

---

## ex1-leader-election — TTL lock, failover, aur zombie leader

Teen scheduler nodes, ek lock server (Redis jaisa `SET NX PX`, **TTL 6 s**, renew har 2 s),
aur ek billing sink jo har window ka charge ginta hai. Leader har second ek billing job fire karta hai.

* `STOP_ON_LOSS=1` — renew fail hote hi scheduling band (sahi). `0` — purana leader apne bharose chalta rehta hai (bug).
* `IDEMP=1` — billing mein `(job, window)` par unique key (`ON CONFLICT DO NOTHING`).

```bash
npm start ex1-leader-election
node tools/kill-leader.js                     # leader maaro, failover naapo

STOP_ON_LOSS=0 npm start ex1-leader-election
node tools/zombie.js                          # leader ko 9 s ka "GC pause"
STOP_ON_LOSS=0 IDEMP=1 npm start ex1-leader-election && node tools/zombie.js
STOP_ON_LOSS=1 npm start ex1-leader-election && node tools/zombie.js
```

```
leader: scheduler-b (term 1)
scheduler-b maara → naya leader scheduler-a (term 2) 5.6 s mein   (TTL ke aas-paas)

STOP_ON_LOSS=0 IDEMP=0:  khud ko leader maanne wale: a, b   lock holder: a
                         billing: windows 14   double-charged: 8
STOP_ON_LOSS=0 IDEMP=1:  khud ko leader maanne wale: a, c   lock holder: c
                         billing: windows 15   double-charged: 0   idempotency key ne roke: 8
STOP_ON_LOSS=1 IDEMP=0:  [a] renew fail → scheduling BAND
                         khud ko leader maanne wale: b
                         billing: windows 16   double-charged: 1
```

👉 Aakhri line dhyan se dekho: `STOP_ON_LOSS=1` ke baad bhi **1** double charge — pause se
jaagne aur agla renew check hone ke beech ek chhoti khidki hai jisme purana node abhi bhi khud
ko leader samajhta hai. Isliye leader election ke saath **idempotency key (ya fencing token)
bhi** chahiye.

---

## ex2-heartbeat-watchdog — priority lanes, crash, poison job

30 jobs: 3 `critical` jaan-boojh kar list ke **aakhir** mein, baaki low/normal/high, aur job 7
"poison" (worker ko atka deta hai, heartbeat band). Teen workers; `w1` apne teesre job ke beech mar
jaata hai. Workers har 0.5 s heartbeat bhejte hain; watchdog 3 s purana heartbeat dekh kar job
wapas `pending` karta hai; 3 attempts ke baad dead letter.

```bash
npm start ex2-heartbeat-watchdog                # QUEUE=priority
node tools/watchdog-run.js
QUEUE=fifo npm start ex2-heartbeat-watchdog && node tools/watchdog-run.js
```

```
QUEUE=fifo       pehle 5 complete: low, normal, high, low, high
QUEUE=priority   💥 worker-w1 job 14 ke beech mara (heartbeat band)
                 pehle 5 complete: critical, critical, critical, high, high
                 done: 29   dead letter: 1   watchdog ne wapas daale: 3   dobara chale: 2
```

👉 Flat queue mein critical jobs sabse baad; priority lanes mein sabse pehle. Mara hua worker
aur atka hua poison job — dono ko watchdog ne pakda; poison job 3 koshishon ke baad dead letter mein.

---

## Ports

| Kya | Port |
|---|---|
| lock-server · billing | 4801 · 4802 |
| scheduler a · b · c | 4811 · 4812 · 4813 |
| jobs-db (ex2) | 4803 |
