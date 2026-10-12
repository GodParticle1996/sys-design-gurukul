# 🐳 Lab 32 — Replication: jo sirf ek hai, wahi poora system hai

System Gurukul → ⚡ Resilience → **Replication Everywhere / Active-Active vs Passive / Replicas ≠ Backups** levels ka lab.
Zero dependency Node (18+). (Asli Postgres streaming replica + WAL archive + point-in-time restore: 🐘 SQL Gurukul lab **08-replication**.)

```bash
npm start ex1-chain          # lb (5101) → app1/app2 (5102/5103) → db1/db2 (5104/5105) — sab ek hi tier.js
node tools/spof.js           # 6 setups, har ek mein t=2s par ek cheez maaro
node tools/badwrite.js       # ex2 — galat DELETE: replica vs backup + log
docker compose --profile ex1-chain up --build
```

`tier.js` = generic tier: request aayi → aage bhejo. `mode`: `single` (koi replica nahi), `active-passive` (health check har
500 ms, 3 fail → standby), `active-active` (dono ko baari-baari, fail → turant dusre par retry). `POST /kill` = process
"mar" gaya (har connection tod deta hai).

## ex1-chain — 8 sec, 100 req/sec, t=2 par kuch mara

```
$ node tools/spof.js
setup                                        kya mara   nateeja
1 app, 1 DB (koi replica nahi)               app1  maara →  590 fail / 786  (24.9% available)  errors ki khidki: 6.0 s
2 apps (active-active), 1 DB                 app1  maara →    0 fail / 789  (100.0% available)  errors ki khidki: 0 s
2 apps, 1 DB — DB mara                       db1   maara →  591 fail / 786  (24.8% available)  errors ki khidki: 6.0 s
2 apps, DB active-passive (3 health checks)  db1   maara →  105 fail / 783  (86.6% available)  errors ki khidki: 1.1 s
2 apps, DB active-active (retry)             db1   maara →    0 fail / 791  (100.0% available)  errors ki khidki: 0 s
sab replicated — par LB sirf EK              lb    maara →  592 fail / 789  (25.0% available)  errors ki khidki: 6.0 s
```

- Do apps rakhe, par DB ek → DB mara toh **sab gaya**. Chain utni hi mazboot jitni uski sabse kamzor kadi.
- **Active-passive**: standby tayyar tha, par switch karne wala health check 3 × 500 ms baad maana → **1.1 sec** errors.
  Asli duniya mein detection + promotion + DNS/VIP move → aksar 30 sec se minutes.
- **Active-active**: retry turant → **0 errors**. Keemat: dono hamesha zinda, dono mein data sync, conflicts ka hisaab.
- Sab replicate kar diya… par **LB ek hi tha** → wapas 25%. Replica tab hi kaam ka jab koi use chunne wala bhi zinda ho.

## ex2 — replica backup nahi hai

```
$ node tools/badwrite.js
02:00 backup (snapshot): 10000 orders, log seq 10000
09:00 tak: primary 10500, replica 10500 orders (500 naye aaj subah)

10:42 intern ne chalaya: DELETE FROM orders;   (WHERE bhool gaya)
   primary: 0 orders    replica: 0 orders   ← replica ne bhi wafadaari se copy kar liya

Restore sirf snapshot se: 10000 orders   (subah ke 500 gaye)
Restore snapshot + log (bad query se thik PEHLE tak, seq < 10501): 10500 orders  ✅ sab wapas
```

Replica **machine** ke marne se bachata hai — isliye galti bhi turant copy karta hai. **Backup + log** galti se bachata hai —
samay mein peeche ja sakte ho. Sirf snapshot = subah ke 500 orders gaye; snapshot + log = bad query se thik pehle tak.

## Kya seekha

| Sawaal | Jawab lab se |
|---|---|
| Replica rakh liya, safe? | Sirf tab jab koi switch kare — aur har tier mein (ek LB = 25%) |
| Active-passive vs active-active | Takeover ki khidki (1.1 s) vs turant retry (0) — par sync ki keemat |
| Replica ya backup? | Dono. Replica ne DELETE bhi copy kiya; backup + log ne 10,500 wapas diye |
