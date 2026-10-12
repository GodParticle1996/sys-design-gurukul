# 🐳 Lab 04 — Snowflake: compute alag, cache paas, resize lazy

```bash
npm start <exercise>
docker compose --profile <exercise> up --build
```

---

## ex1-split-compute — teen workloads, ek pool ya alag pools

`services/storage.js` ke paas data hai; `services/engine.js` ke paas kuch nahi —
woh sirf queries chalata hai. `MODE=one` mein saare workloads ek pool par,
`MODE=split` mein har workload ka apna pool.

```bash
npm start ex1-split-compute                 # MODE=one
node tools/workloads.js --for 4

MODE=split npm start ex1-split-compute
node tools/workloads.js --for 4
node tools/kill-warehouse.js                # beech mein warehouse maar do
```

```
MODE=one   bi p99: 3122 ms   bi p50: 732 ms   ds p99: 5135 ms   etl queries: 69   (bi 414 queries)
MODE=split bi p99: 1008 ms   bi p50: 252 ms   ds p99:  293 ms   etl queries: 79   (bi 474 queries)

warehouse killed mid-query → chalti query: LOST   engine up: nahi
storage mein rows: 50,00,000 (waisi ki waisi)  ✅ data compute mein tha hi nahi
```

👉 Alag pools se ETL dashboards ko dheema nahi karta. Aur compute ke paas data hai hi nahi —
isi liye use kabhi bhi maara/badla ja sakta hai.

---

## ex2-cache-and-resize — cache, lazy resize aur work stealing

`services/cluster.js` mein 1024 files hain. Jo file node ke local cache mein hai woh
0.2 ms mein, warna "storage" se 3 ms mein aati hai.

```bash
npm start ex2-cache-and-resize
node tools/query.js --repeat 2                       # cold vs warm
node tools/resize.js --to 8 --mode eager             # turant rebalance
node tools/reset.js
node tools/resize.js --to 8 --mode lazy              # ownership pehle, data baad mein
node tools/straggler.js --slow 3 --steal off
node tools/straggler.js --slow 3 --steal on
```

```
run 1 (cold): 768 ms   remote reads: 1024   cache hit:   0%
run 2 (warm):  51 ms   remote reads:    0   cache hit: 100%

eager resize 4 → 8: upfront moved 512 blocks, resize time 621 ms
   resize ke baad queries: 26 ms (hit 100%) → 26 ms → 24 ms

lazy  resize 4 → 8: upfront moved   0 blocks, resize time   5 ms
   resize ke baad queries: 204 ms (hit 50%) → 25 ms (hit 100%) → 26 ms

slow node 3×  steal=off → query 77 ms
slow node 3×  steal=on  → query 31 ms
```

👉 Eager resize cache hit 100% par rakhta hai, par uske liye 512 blocks **abhi** network par
ghumate hain (621 ms, aur woh bhi tab jab cluster busy hai). Lazy resize 5 ms leta hai,
pehli query thodi dheemi (204 ms), aur **teen queries mein** cache wapas 100%.

---

## Ports

| Kya | Port |
|---|---|
| storage | 4400 |
| engine (ex1) | 4401 |
| cluster (ex2) | 4402 |
