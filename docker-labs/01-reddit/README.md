# 🐳 Lab 01 — Reddit: facts, answers, rank aur cache

Chaar exercises. Har ek ek hi sawaal poochhti hai aur uska jawab **numbers se** deti hai.

```bash
npm start <exercise>          # Docker ke bina (Node 18+)
docker compose --profile <exercise> up --build    # Docker ke saath
```

Neeche jo numbers likhe hain woh **asli run** ke hain (Node 24, ek laptop). Tumhare
machine par thode alag aayenge — pattern wahi rahega.

---

## ex1-facts-answers — user ka intezaar kitna chhota ho

`services/vote-service.js` ek vote par **20 answers** theek karta hai (score, listings,
karma, caches). Do modes:

* `MODE=sync` — saare 20 repairs **user ke saamne**, phir jawab
* `MODE=async` — sirf fact likho, 20 jobs queue par daalo, turant jawab; worker baad mein

```bash
npm start ex1-facts-answers                       # (MODE=sync)
node tools/vote-load.js --votes 150 --rate 25 --readers 10

MODE=async npm start ex1-facts-answers
node tools/vote-load.js --votes 150 --rate 25 --readers 10
```

Asli output:

```
MODE=sync   vote p99: 23 ms   vote p50: 22 ms   read p99: 50 ms   answers repaired: 3000   queue peak: 0
MODE=async  vote p99:  4 ms   vote p50:  2 ms   read p99: 37 ms   answers repaired: 3000   queue peak: 20   drain: 0.0 s
```

👉 **Kaam kam nahi hua — dono mein 3000 repairs.** Sirf yeh badla ki intezaar kaun karta hai.

---

## ex2-hot-rank — stored answer kab sadta hai

`services/rank-service.js` 2,000 posts rakhta hai aur ek **stored listing** maintain karta
hai. Lab mein waqt tez chalta hai: **1 asli second = 1 simulated ghanta**.

* `CLOCK=submitted` — `log10(score) + t_submitted/45000` (Reddit): ghadi se rank **nahi** badalta
* `CLOCK=now` — `log10(score) / (age+2)^1.5` (Hacker News jaisa decay): har pal rank badalta hai

```bash
npm start ex2-hot-rank                            # (CLOCK=submitted)
node tools/rank-check.js --for 12 --every 3

CLOCK=now npm start ex2-hot-rank
node tools/rank-check.js --for 12 --every 3
```

Asli output:

```
CLOCK=submitted drift checks: 4   listings wrong: 0   worst positions wrong (top 25): 0    rebuilds needed: 0
CLOCK=now       drift checks: 4   listings wrong: 4   worst positions wrong (top 25): 22   rebuilds needed: 4
```

👉 Ek bhi naya vote nahi aaya — phir bhi `CLOCK=now` wali listing galat ho gayi.

---

## ex3-cache-layers — stampede, lock aur stale

`services/listing-service.js` ka rebuild **800 ms** leta hai. `tools/stampede.js` cache
expire karke 500 requests ek saath bhejta hai.

```bash
npm start ex3-cache-layers                        # LOCK=0 STALE=0
node tools/stampede.js --concurrency 500

LOCK=1 npm start ex3-cache-layers && node tools/stampede.js --concurrency 500
LOCK=1 STALE=1 npm start ex3-cache-layers && node tools/stampede.js --concurrency 500
```

Asli output:

```
LOCK=0 STALE=0   rebuilds: 177   p50: 1698 ms   p99: 2373 ms   db busy: 166.3 s
LOCK=1 STALE=0   rebuilds:   1   p50:  867 ms   p99:  869 ms   db busy:   0.8 s   (499 requests ne INTEZAAR kiya)
LOCK=1 STALE=1   rebuilds:   1   p50:  256 ms   p99:  261 ms   db busy:   0.8 s   (499 ko STALE copy mili)
```

👉 **Lock database ko bachata hai, stale serving user ko.** Dono alag problem hain.

---

## ex4-strangler — 1% traffic aur instant rollback

Gateway ke peechhe `monolith` aur `new-service` dono chalte hain. Naye service mein
jaan-boojh kar ek bug hai (`BUG_RATE=0.3` — kuch ids par karma galat). Gateway jab
naye service par bhejta hai toh dono ka jawab **compare** bhi karta hai.

```bash
npm start ex4-strangler
node tools/shift.js --rps 200 --for 3
curl -X POST localhost:4104/admin/shift/1  && node tools/shift.js --rps 200 --for 3
curl -X POST localhost:4104/admin/shift/50 && node tools/shift.js --rps 200 --for 3
curl -X POST localhost:4104/admin/shift/0                      # rollback
```

Asli output:

```
SHIFT=  0%   monolith: 486   new:   0   mismatches:  0   p99: 26 ms
SHIFT=  1%   monolith: 563   new:   9   mismatches:  3   p99:  5 ms
SHIFT= 50%   monolith: 272   new: 299   mismatches: 98   p99:  5 ms
rollback took 3 ms
```

👉 Bug dono baar wahi tha. Farq sirf itna ki **kitne users usse takraaye**.

---

## Ports

| Service | Port |
|---|---|
| vote-service | 4101 |
| rank-service | 4102 |
| listing-service | 4103 |
| gateway · monolith · new-service | 4104 · 4105 · 4106 |
