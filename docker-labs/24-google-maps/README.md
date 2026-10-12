# 🐳 Lab 24 — Google Maps: naksha dheere badalta hai, traffic har minute

System Gurukul → 🌍 Planet-scale Infra → **Google Maps** levels ka lab. Zero dependency Node (18+).

```bash
npm start ex1-routing         # maps service (5001) — 300×300 grid = 90,000 junctions, overlay cell 15×15
node tools/route.js           # Dijkstra vs A* vs bidirectional vs cell-overlay
node tools/jam.js             # jam ke baad: ek cell dobara vs poora naksha dobara
node tools/eta.js             # ex2 — "abhi wali speed" vs time-dependent ETA (koi server nahi)
node tools/nearby.js          # ex3 — full scan vs Hilbert (S2 jaisa) key
docker compose --profile ex1-routing up --build
```

## ex1-routing — ek raasta, chaar tareeke

```
$ node tools/route.js
graph 300x300 = 90000 junctions | overlay: cell 15x15, 22400 border nodes, 1232000 shortcuts, banne mein ~1100 ms

sheher ke aar-paar (20,150 → 280,160)
  dijkstra  ETA 27.24 min   junctions dekhe  65260   edge relax  260444    18.8 ms
  astar     ETA 27.24 min   junctions dekhe   9196   edge relax   36759     4.5 ms
  bidir     ETA 27.24 min   junctions dekhe  46153   edge relax  184151    18.4 ms
  overlay   ETA 27.24 min   junctions dekhe   2513   edge relax  131808       6 ms

ghar se office (50,50 → 140,120)
  dijkstra  ETA 15.69 min   junctions dekhe  27857   edge relax  111105     6.4 ms
  astar     ETA 15.69 min   junctions dekhe   7695   edge relax   30776     2.1 ms
  bidir     ETA 15.69 min   junctions dekhe  21772   edge relax   86961    11.4 ms
  overlay   ETA 15.69 min   junctions dekhe   2153   edge relax  112116     8.4 ms
```

Chaaron ka **jawab bilkul same** (ETA same) — farq sirf mehnat ka hai. Dijkstra manzil ki taraf nahi dekhta, isliye
har taraf gol daayra banata hai (65,260 junctions). A* ko pata hai manzil kis taraf hai → **9,196**. Overlay beech ke
cells ki gallis mein ghusta hi nahi → **2,513**.

> Is grid mein har cell ke border bahut zyada hain (56–96), isliye overlay ke edge relaxations zyada dikhte hain.
> Asli sadkon mein cell se nikalne ke raaste kam hote hain (highway do-chaar jagah se hi cross karti hai) — wahan overlay
> ka fayda aur bada hota hai.

## ex1 (dusra tool) — jam ke baad kitna kaam dobara?

```
$ node tools/jam.js
jam se pehle: ETA 15.31 min

Manzil ke aas-paas ke ilaake mein jam: 676 sadkein 12x dheemi (cell 210)
  purane overlay se ETA: 19.17 min  ← galat, shortcuts purane hain
  asli (Dijkstra, live weights): 20.25 min

  sirf wo cell dobara: 56 border nodes, 13 ms → ETA 20.25 min
  poora naksha dobara: 22400 border nodes, 1226 ms → ETA 20.25 min

  ek cell ka kaam poore naksha se 94x sasta — aur natija bilkul same.
```

Yahi CRP (Customizable Route Planning) ka dil hai: **topology (naksha) aur cost (traffic) alag-alag rakho**.
Naksha saal mein kabhi badalta hai — uske border nodes ki list wahi rehti hai. Traffic har minute badalta hai —
sirf us cell ke andar ke border-to-border numbers dobara ninkaalo, **13 ms**.

## ex2 — ETA: "abhi khaali hai" vs "jab tum wahan pahunchoge"

Maps ke paas har sadak ka **seekha hua** speed curve hai (history). Aaj ka asli traffic usse thoda alag hai
(peak 9 minute late, thoda zyada) — isliye time-dependent bhi perfect nahi, par karib hai.

```
$ node tools/eta.js
nikalne ka time   "abhi wali speed" ETA   time-dependent ETA   asli safar   static ki galti   TD ki galti
     16:30               43.4 min           51.6 min         50.4 min       -7.0 min    +1.2 min
     17:00               52.3 min           70.0 min         69.9 min      -17.6 min    +0.1 min
     18:30               99.4 min           66.8 min         74.7 min      +24.6 min    -7.9 min
     19:00               82.0 min           55.0 min         61.1 min      +20.8 min    -6.2 min

Sabse buri galti 18:30 par: 24.6 min (33%).
```

17:00 par nikalne wale ko "abhi to theek hai" dikhta hai — par wo 40 minute baad peak ke beech mein hoga: ETA **17.6 min kam**.
18:30 par ulta — traffic khatam hone wala hai, par "abhi wali speed" 24.6 min **zyada** bataati hai.
Sadak ka weight ek number nahi, ek **curve** hai; aur us curve par kis waqt pahunchoge, wahi weight lagta hai.

## ex3 — 10 lakh jagahein, "mere 2 km ke andar kya hai?"

```
$ node tools/nearby.js
1,000,000 jagahein, query: 2.0 km ke andar

tareeka         rows padhi        mile      time
full scan       1,000,000       113    9 ms
Hilbert key           264       113    3 ms   (16 cells, level 8)

rows 3788x kam, jawab bilkul same (113 = 113).
```

Har jagah ko Hilbert curve par ek number do aur sorted rakho. Hilbert curve ki khoobi: **jo paas hain, unke number bhi
lagbhag paas hote hain**, aur ek poora level-cell curve par **contiguous** hota hai → query ka square kuch ranges ban jaata hai →
`WHERE key BETWEEN a AND b` — wahi cheez jo har database (B-tree index) sabse achha karta hai.
S2 yahi karta hai par gol zameen par: sphere → cube ke 6 face → har face par Hilbert → ek 64-bit cell id.

## Kya seekha

| Sawaal | Jawab lab se |
|---|---|
| Raasta jaldi kaise? | A*: 65,260 → 9,196 junctions; overlay: 2,513 |
| Traffic badla, sab dobara? | Sirf us cell ka overlay: 1,226 ms → 13 ms |
| ETA "abhi" se kyun nahi? | 33% tak galti — sadak ka weight waqt ke saath badalta hai |
| Aas-paas dhoondhna | 2-D → 1-D (Hilbert/S2): 10 lakh rows → 264 |
