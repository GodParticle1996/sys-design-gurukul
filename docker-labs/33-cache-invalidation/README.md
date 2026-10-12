# 🐳 Lab 33 — Cache invalidation: purana price kitni der dikhega?

System Gurukul → 💾 Data → **Caching / Cache Stampede / Cache Invalidation** levels ka lab. Zero dependency Node (18+).

```bash
npm start ex1-invalidation     # db (5111) + cache (5112) + app1/app2 (5113/5114, apna L1) + invalidator (5115, CDC)
node tools/staleness.js        # price badla — kaun kitni der galat dikhata hai
node tools/stampede.js         # hot key expire + 1,000 requests ek saath
docker compose --profile ex1-invalidation up --build
```

```
            ┌── app1 (L1) ──┐
client ──►  │               ├──► shared cache ◄── DEL + publish ── invalidator ◄── change log ── db
            └── app2 (L1) ──┘         │                                                          ▲
                   ▲                  └──────── invalidation events (pub/sub) ───► L1 saaf        │
                   └──────────────────── miss → db read (30 ms / 400 ms) ─────────────────────────┘
```

## ex1 — DB mein price badla (79,999 → 74,999)

```
$ node tools/staleness.js
tareeka                                  kitni der galat price (DB badalne ke baad)
sirf TTL (cache 5 s, L1 5 s)             app1 purana dikhaya  3998 ms   app2  4028 ms
CDC → shared cache DEL (L1 ko pata nahi) app1 purana dikhaya  4040 ms   app2  4044 ms
CDC + L1 ko pub/sub se khabar            app1 purana dikhaya    91 ms   app2   121 ms
```

- **Sirf TTL**: "kabhi na kabhi theek ho jaayega" — 4 sec tak galat price (L1 aur cache ke TTL alag waqt shuru hote toh jud bhi sakte the).
- **CDC** (DB ka change log padh ke shared cache se DEL): shared cache turant theek… par har app ki **L1** ko khabar nahi → phir bhi 4 sec.
- **CDC + pub/sub**: invalidation event har app tak → L1 bhi saaf → **~100 ms**. Invalidation tabhi poora jab **har layer** tak pahunche.

## ex1 (dusra tool) — stampede: sale shuru, key abhi-abhi expire hui

Cache TTL 2 s. 1.9 sec tak steady traffic, phir expire ke 80 ms baad **1,000 requests ek saath**. Is test mein DB read = **400 ms**
(product page + reviews ka bhaari query).

```
$ node tools/stampede.js
strategy   DB reads (peak parallel)   burst p50   burst p99   burst mein stale jawab mile?
none          757 (ek saath 739)    1087 ms    1339 ms   nahi
mutex           3 (ek saath   2)     457 ms     472 ms   nahi
swr             3 (ek saath   2)     122 ms     217 ms   haan (thodi der ke liye)
xfetch          3 (ek saath   2)     122 ms     226 ms   nahi
```

(DB reads mein 1 warm-up read shaamil hai; "none" run-to-run 300–750 ke beech aata hai.)

- **none**: har request khud DB ki taraf → **757 bhaari queries ek saath**. Asli DB yahin gir jaata.
- **mutex** (single-flight): har app se sirf ek jaata hai, baaki usi ka intezaar → 3 reads, par sab ~400 ms ruke.
- **swr** (stale-while-revalidate): purana price turant, peeche ek refresh → tez, par thodi der purana data.
- **xfetch** (probabilistic early refresh): expire ke paas har request thode chance se pehle hi refresh kar deti hai (ek waqt
  mein ek) → key **kabhi thandi hi nahi hoti** → tez **aur** taaza. Shart: key par traffic aata rehna chahiye.

## Kya seekha

| Sawaal | Jawab lab se |
|---|---|
| Price badla, cache purana | TTL = 4 s galat; CDC + pub/sub = ~100 ms |
| L1 (process cache) ka kya? | Shared cache DEL kaafi nahi — L1 ko event chahiye |
| Hot key expire | none: 757 DB queries; mutex/swr/xfetch: 3 |
| Kaunsa chunein? | Staleness chalegi → swr; nahi chalegi par traffic hai → xfetch; warna mutex |
