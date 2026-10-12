# 🐳 Lab 26 — Google Search: 0.2 second mein poora web

System Gurukul → 🌍 Planet-scale Infra → **Google Search** levels ka lab. Zero dependency Node (18+).

```bash
node tools/index.js                # ex1 — inverted index: compression + AND intersection (koi server nahi)
npm start ex2-fanout               # leaf (5021, 1% stragglers) + root (5022, scatter-gather)
node tools/fanout.js               # 1 shard vs 100 shards; single vs hedged vs double
node tools/pagerank.js             # ex3 — link farm vs damping vs TrustRank
docker compose --profile ex2-fanout up --build
```

## ex1 — inverted index: har shabd → documents ki list

```
$ node tools/index.js
200,000 documents, 5000 shabd, 16,262,112 postings

posting lists: raw 4-byte ints 62.0 MB  →  delta + varint 17.7 MB  (3.5x chhota)

AND query                        list sizes             bina skip: comparisons    skip pointers: comparisons   results
bahut common + bahut common       118035 × 102778          156250                  906304          64563
common + rare                     141391 × 1693            141752                   14696          1276
rare + rare                         1410 × 1275              2673                    7281          11
```

- **Compression**: doc ids sorted hain → har id ki jagah "pichhle se kitna aage" likho (delta) → chhote numbers →
  varint mein zyadatar **1 byte** → 62 MB → **17.7 MB**. Chhota index = zyada RAM mein fit = kam disk.
- **Intersection**: "cheap AND flights". Ek list chhoti ho toh lambi list mein skip pointers se chhalaang + chhota binary
  search → 141,752 → **14,696** comparisons (9.6×). Dono badi hon toh seedha merge hi best (skip ne 156k → 906k kar diya!) —
  asli engines list sizes dekh ke tareeka chunte hain.

## ex2-fanout — tail at scale

Leaf: aam request ~4 ms, par **1%** requests +50..150 ms (GC pause, noisy neighbour). Root query ko 100 shards par
bhejta hai aur **sabka** intezaar karta hai. `hedged` = 10 ms (≈ p95) tak jawab nahi → dusre replica ko bhi bhejo.

```
$ node tools/fanout.js
shards  mode      query p50    p99      max      leaf requests per query
    1   single        4 ms     96 ms    112 ms   1.0 (0% extra)
  100   single       93 ms    157 ms    159 ms   100.0 (0% extra)
  100   hedged       14 ms     78 ms     78 ms   103.5 (3% extra)
  100   double        9 ms     66 ms    113 ms   200.0 (100% extra)
```

1 shard par 1% dheemapan p50 mein dikhta bhi nahi (4 ms). 100 shards: 1 − 0.99¹⁰⁰ = **63%** queries mein kam se kam ek
straggler → **median query 93 ms**! Hedged: sirf dheeme walon ke liye backup → **3% extra load**, p50 **14 ms**.
Double (hamesha dono): thoda aur tez, par **load dugna** — hedging wahi fayda sasta deta hai.

## ex3 — PageRank aur link farm

10,000 asli pages + 300 spam pages jo sirf ek dusre ko aur "cheap-pills.biz" ko link karte hain.

```
$ node tools/pagerank.js
tareeka                               farm ke paas kul rank   target ki position   sabse popular asli page
d = 0.99 (lagbhag koi teleport nahi)       5.2 %            #1                  page 0 (#2)
d = 0.85 (Google paper wala)               3.0 %            #2                  page 0 (#1)
d = 0.85 + TrustRank seeds                 0.1 %            #1646               page 0 (#1)
```

Random surfer farm mein ghusa toh bahar ka koi link nahi → rank wahin ghoomti hai, sab target par → junk page **#1**.
Damping (15% baar random jump) jaal ko chhota karta hai, par target phir bhi **#2**. Teleport sirf bharosemand seeds par
(TrustRank) → farm tak rank pahunchti hi nahi → **#1646**. Isi liye aaj ranking mein links sirf ek signal hain, sab kuch nahi.

## Kya seekha

| Sawaal | Jawab lab se |
|---|---|
| Index itna bada, RAM mein kaise? | Delta + varint: 3.5× chhota |
| "A AND B" tez kaise? | Chhoti list ke hisaab se chalo: 9.6× kam kaam |
| 100 machines, ek dheemi | Median 93 ms → hedged 14 ms, sirf 3% extra |
| Links khareed ke rank? | Damping kaafi nahi; trust seeds: #1 → #1646 |
