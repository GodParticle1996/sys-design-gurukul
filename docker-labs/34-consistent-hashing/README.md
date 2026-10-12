# 🐳 Lab 34 — Consistent hashing: ek node gaya, poora cache nahi

System Gurukul → 💾 Data → **Consistent Hashing** levels ka lab. Zero dependency Node (18+).

```bash
npm start ex1-ring          # 7 cache nodes (5121–5127) — 6 chalu, 7va "naya node" joda jaayega
node tools/rehash.js        # 1 lakh keys × 4 routing tareeke
docker compose --profile ex1-ring up --build
```

`lib/router.js` = client ka router (key → node). `modulo` = `hash % N`. `ring` = har node ring par ek jagah, key ke baad
clockwise pehla node. `vnodes` = har node ring par 150 jagah. `weighted` = vnodes, par node1 (dugni RAM) ko dugne vnodes.

## ex1-ring

```
$ node tools/rehash.js
mode       load (sabse zyada / sabse kam keys)   node3 mara → cache miss (DB queries)   node7 joda → keys hilin
modulo      16761 / 16561  =   1.0x                          83288 (83.3%)                       85865 (85.9%)
ring        26583 / 931    =  28.6x                          26583 (26.6%)                        8928 (8.9%)
vnodes      17722 / 14933  =   1.2x                          17722 (17.7%)                       14312 (14.3%)
weighted    28472 / 13280  =   2.1x (node1 weight 2 → 28472)  15088 (15.1%)                       12534 (12.5%)
```

Ideal: node mara → sirf **uski** keys (~1/6 = 16.7%) miss. Node joda → sirf ~1/7 = 14.3% keys hilen.

- **modulo**: load ekdum barabar, par N badla (6 → 5 ya 6 → 7) toh **83–86%** keys ki jagah badli → poora cache ek saath
  thanda → 83,000 queries DB par ek saath. Isi ko "rehash storm" kehte hain.
- **ring** (ek jagah per node): sirf padosi ki keys hilti hain, par load **28.6× tedha** — ek node ke paas 931 keys, dusre ke 26,583.
  Wahi bada node mara toh 26.6% miss.
- **vnodes** (150 per node): load 1.2× ke andar, node mara → **17.7%**, node joda → **14.3%** — lagbhag ideal.
- **weighted**: node1 ko jaan-boojh ke dugna (28,472) — bade machine ko bada hissa, baaki waise hi barabar.

## Kya seekha

| Sawaal | Jawab lab se |
|---|---|
| `hash % N` mein kya bura? | N badla → 83% keys hilin → DB par toofan |
| Ring kaafi hai? | Nahi — ek point per node = 28.6× load skew |
| Vnodes | Barabar load (1.2×) + sirf zaroori keys hilin (14–18%) |
| Machines alag size ki | Weight ke hisaab se vnodes |
