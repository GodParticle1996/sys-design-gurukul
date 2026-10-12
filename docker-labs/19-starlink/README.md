# 🐳 Lab 19 — Starlink: satellite har 3 sec badle, SSH phir bhi na toote

System Gurukul → 🌍 Planet-scale Infra → **Starlink** levels ka lab. Zero dependency Node (18+).

```bash
DISH_MODE=direct    npm start ex1-handover     # har epoch satellite gaya = connection gaya
DISH_MODE=reactive  npm start ex1-handover     # PoP tunnel, par handover tab jab heartbeat mare
DISH_MODE=scheduled npm start ex1-handover     # PoP tunnel + ephemeris: pehle se pata, pehle se switch
node tools/session.js --secs 20                # dusre terminal mein — lambi SSH jaisi session
SURPRISE=1 DISH_MODE=scheduled npm start ex1-handover     # achaanak satellite maut bhi
node tools/latency.js [--route 1.3]            # ex2 — fiber vs vacuum, koi server nahi
docker compose --profile ex1-handover up --build          # ya Docker se (DISH_MODE / SURPRISE env)
```

| Service | Port | Kaam |
|---|---|---|
| `server` | 4891 | "internet" ka server. Har TCP connection = ek session (`session=abcd count=N`) |
| `sky` | 4892 + 4900–4905 | 6 satellites (TCP relays). Epoch k mein sirf sat `k % 6` dikhta hai. Epoch = **3 sec** (asli 15 sec). Nazar se bahar = link **chup** (blackhole, koi FIN/RST nahi) |
| `pop` | 4894 | Zameen ka PoP — user ka public IP + server wala TCP connection **yahin** rehta hai |
| `dish` | 4893 (+4895 stats) | User ka terminal. `direct` / `reactive` (heartbeat 200 ms, dead-interval 1000 ms) / `scheduled` (`GET /schedule` = ephemeris) |

`session.js`: har 100 ms `PING n`, 1.5 sec tak jawab nahi → app reconnect (SSH ServerAliveInterval jaisa).

## ex1-handover — teen tarike, 20 sec, 6 handovers

```
$ node tools/session.js --secs 20          # DISH_MODE=direct
mode=direct  20s  pings 199  jawab 100 (50%)  rtt p50 1 ms p99 2 ms
  server sessions: 7  (1 = SSH kabhi nahi toota)   app reconnects: 6
  stalls >400ms: 6  sabse lamba: 1802 ms   t=3.6s:1702ms t=6.7s:1802ms t=9.7s:1802ms t=12.6s:1702ms t=15.6s:1703ms t=18.6s:1703ms

$ node tools/session.js --secs 20          # DISH_MODE=reactive
mode=reactive  20s  pings 199  jawab 198 (99%)  rtt p50 1 ms p99 894 ms
  server sessions: 1  (1 = SSH kabhi nahi toota)   app reconnects: 0
  stalls >400ms: 6  sabse lamba: 997 ms   t=2.8s:899ms t=5.8s:902ms t=8.8s:901ms t=11.8s:996ms t=14.8s:997ms t=17.8s:993ms
  dish: scheduled switches 0, reactive 6, satellite search tries 21, resent 51

$ node tools/session.js --secs 20          # DISH_MODE=scheduled
mode=scheduled  20s  pings 199  jawab 199 (100%)  rtt p50 1 ms p99 3 ms
  server sessions: 1  (1 = SSH kabhi nahi toota)   app reconnects: 0
  stalls >400ms: 0  sabse lamba: 0 ms
  dish: scheduled switches 7, reactive 0, satellite search tries 0, resent 0
```

| Mode | Jawab | Server sessions | Har handover par ruka |
|---|---|---|---|
| direct | 50% | **7** (SSH 6 baar toota) | ~1.7 sec + naya login |
| reactive (anchor, OSPF jaisa) | 99% | 1 | ~0.9–1.0 sec (dead-interval) |
| scheduled (anchor + ephemeris) | **100%** | 1 | **0** |

- **direct**: server ka TCP connection satellite ke raaste se bandha hai. Satellite gaya → link chup → app 1.5 sec wait karke
  dobara judta hai → server ke liye **naya session**. Har 3 sec yahi.
- **reactive**: PoP anchor ne session bacha liya (1 session) — server ko pata hi nahi ki neeche kuch badla. Par dish ko tab
  pata chalta hai jab 1 sec tak heartbeat nahi aata, phir satellites ek-ek karke try (21 tries). 51 pings dobara bheje (`resent`),
  PoP ne `seq` dekh ke duplicate nahi hone diye.
- **scheduled**: dish ke paas schedule hai ("epoch k → sat k % 6"). Boundary ke 30 ms baad naya tunnel naye sat se, purana
  abhi overlap (400 ms) mein zinda → **make-before-break**. Koi search nahi, koi resend nahi, p99 **3 ms**.

### Surprise: jo schedule mein nahi tha

```
$ node tools/session.js --secs 24          # SURPRISE=1 DISH_MODE=scheduled
mode=scheduled  24s  pings 239  jawab 239 (100%)  rtt p50 1 ms p99 801 ms
  server sessions: 1  (1 = SSH kabhi nahi toota)   app reconnects: 0
  stalls >400ms: 2  sabse lamba: 1100 ms   t=6.0s:1100ms t=17.8s:982ms
  dish: scheduled switches 6, reactive 2, satellite search tries 10, resent 20

$ node tools/session.js --secs 24          # SURPRISE=1 DISH_MODE=direct
mode=direct  24s  pings 239  jawab 115 (48%)
  server sessions: 8  (1 = SSH kabhi nahi toota)   app reconnects: 7
```

Har 4th epoch mein satellite achaanak mar jaata hai. Schedule ko pata nahi tha → reactive fallback (heartbeat) ne 2 baar
bachaaya (~1 sec ruka), phir bhi **1 session, 100% jawab**. Asli Starlink bhi yahi: predictable badlaav schedule se,
sirf asli surprise ke liye reactive — aur surprise wala sat **agle plan** (≤15 sec) se bahar.

## ex2 — fiber vs vacuum (physics pehle)

```
$ node tools/latency.js
  GEO 35,786 km: 239 ms ek taraf  → round trip 477 ms (asli mein ~600 ms)
  LEO    550 km: 3.7 ms ek taraf  → round trip 7.3 ms (asli 20–40 ms, zyada zameen ka network)

raasta                  doori km   fiber (route 1x)   space lasers   kaun jeeta
Mumbai → Pune              120        0.6 ms           4.1 ms    fiber by 3.5 ms
Mumbai → Delhi            1150        5.8 ms           7.9 ms    fiber by 2.1 ms
Mumbai → Singapore        3900       19.5 ms          18.0 ms    space by 1.5 ms
London → New York         5570       27.9 ms          24.1 ms    space by 3.7 ms
Mumbai → London           7200       36.0 ms          30.1 ms    space by 5.9 ms
London → Singapore       10880       54.4 ms          43.6 ms    space by 10.8 ms
New York → Tokyo         10850       54.3 ms          43.5 ms    space by 10.8 ms

Break-even: ~2757 km se lambe raaste par space jeetta hai (ek taraf ka time, route factor 1).
```

`--route 1.3` (fiber seedhi line mein nahi bichhta): break-even **~1296 km**, London → Singapore par space **27 ms** aage.
Assumptions: glass 2 lakh km/s, vacuum 3 lakh km/s, upar-neeche 2 × 550 km, orbit height par raasta 10% lamba.
Video (Mark Handley, UCL simulations): ~3,000 km ke baad space jeetta hai — yahi number.

## Kya seekha

| Sawaal | Jawab lab se |
|---|---|
| Neeche ka raasta har 3 sec badle | Identity (IP, TCP) ek **anchor** (PoP) par rakho — 7 sessions → 1 |
| Badlaav pehle se pata hai | Reactive (OSPF hello/dead) mat karo — **schedule** se switch: stall 1 sec → 0 |
| Kuch achaanak toota | Reactive fallback rakho, par sirf surprise ke liye |
| Space ya fiber? | Physics: ~3,000 km se lamba raasta → vacuum jeetta |
