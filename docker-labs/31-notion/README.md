# 🐳 Lab 31 — Notion: sab kuch ek block hai

System Gurukul → 🏢 Real Company Stories → **Notion** levels ka lab. Zero dependency Node (18+).
(Tree ko SQL mein kaise rakhein — adjacency list, recursive CTE, closure table — woh 🐘 SQL Gurukul ke **db-trees** level mein.)

```bash
npm start ex1-blocks          # block store (5091): ~4,000 blocks, 32 shards
node tools/pageload.js        # permission walk, sharding, move
npm start ex2-lake            # primary (5092) + lake (5093)
node tools/lake.js            # analytics scan kahan chalayein
docker compose --profile ex1-blocks up --build     # profiles: ex1-blocks, ex2-lake
```

## ex1-blocks — page kholna = ~2,000 blocks + har ek ki permission

Har block: `{id, type, parent, workspace, content, share?}`. Permission block par likhi nahi hoti — **ancestors** ki taraf
chalo (parent → parent → … → workspace), pehli `share` jahan mile wahi jawab. Har block padhna = ek DB lookup (20 µs asli wait).

```
$ node tools/pageload.js
A) permission check: har block ke liye poora ancestor walk vs page-level memo
   naive  dikhe 2001 blocks   DB lookups  17346   379.2 ms
   memo   dikhe 2001 blocks   DB lookups   4003   84.2 ms

B) sharding: 32 shards — page load mein kitne shards ko chhuna pada?
   shard by block     → 22 / 32 shards (ek page ke liye)
   shard by workspace →  1 / 32 shards (ek page ke liye)

C) block MOVE karna permission badal deta hai
   HR → Salaries page: aman ko dikhe 0 blocks (HR page par aman = none).  Team Wiki mein aman ko: 2001
   riya ne ek toggle (salaries-b0 + uske andar sab) Salaries se Team Wiki mein drag kiya
   ab aman ko Team Wiki mein 4001 blocks dikhe → 2000 salary wale blocks ab aman ko dikh rahe hain!
```

- **A**: har block ke liye upar tak chalna = 17,346 lookups. Ek page ke andar sab blocks ke ancestors wahi hain → **memo**
  (jo ek baar pata chala, yaad rakho) → 4,003 lookups, **4.5× tez**.
- **B**: block id se shard karo toh ek page ke blocks 22 shards par bikhre (22 network round trips). **Workspace** se shard
  karo toh ek page = **1 shard** — Notion ne Postgres ko workspace_id se hi shard kiya (480 logical shards).
- **C**: content bilkul nahi badla, sirf **parent** badla → permission ancestors se aati hai → 2,000 salary blocks aman ko
  dikhne lage. Isi liye move ek "permission event" hai — UI mein warning, audit log, aur cache invalidation zaroori.

## ex2-lake — analytics kahan chalayein?

Live reads (~1 ms CPU) primary par chal rahe hain. Analytics team ka 3 sec CPU wala scan — primary par ya CDC copy (lake) par?

```
$ node tools/lake.js
koi analytics nahi                 live reads  2588   p50   6 ms   p99   14 ms
analytics scan PRIMARY par         live reads  3005   p50  20 ms   p99   27 ms
analytics scan LAKE (CDC copy) par live reads  2562   p50   6 ms   p99   16 ms
```

Primary par scan → users ke page loads CPU ke liye line mein: p50 **6 → 20 ms**. Lake par → primary ko pata bhi nahi.
Notion: Postgres → CDC (change stream) → data lake; analytics aur AI features wahan, live traffic primary par.

## Kya seekha

| Sawaal | Jawab lab se |
|---|---|
| Nested blocks ki permission | Ancestors walk + page-level memo: 17,346 → 4,003 lookups |
| Kis cheez se shard karein? | Jo ek saath padha jaata hai: workspace → 1 shard per page (vs 22) |
| Block move | Parent badla = kaun dekh sakta hai badla (2,000 blocks leak) |
| Analytics vs live traffic | Alag copy (CDC → lake): p50 20 ms → 6 ms |
