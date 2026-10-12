# 🐳 Lab 02 — Cloudflare: anycast, config, early drop, isolates

```bash
npm start <exercise>
docker compose --profile <exercise> up --build
```

Neeche ke saare numbers **asli run** ke hain (Node 24, ek laptop).

---

## ex1-anycast-slicing — attack ka aakaar badalna

6 "sheher", har ek **700 rps** sambhal sakta hai (token bucket; usse zyada = drop).
`tools/attack.js` 6,000 rps ka mix bhejta hai (95% bots, 5% asli users).

```bash
npm start ex1-anycast-slicing
node tools/attack.js --rps 6000 --for 3                  # MODE=single (default)
MODE=anycast node tools/attack.js --rps 6000 --for 3
```

```
MODE=single   city-1: 4065/s  city-2..6: 0/s
MODE=single   dropped: 79%   asli users serve hue: 23%
MODE=anycast  city-1..6: 683/s har ek
MODE=anycast  dropped:  0%   asli users serve hue: 100%
```

👉 Attack utna hi bada tha. Sirf **load ka aakaar** badla — koi filtering nahi hui.

---

## ex2-config-push — config read path se hatana

Har page request ko **20 config lookups** chahiye.
`CONFIG=central` → 20 network calls. `CONFIG=local` → 20 memory reads (poora dataset paas mein).

```bash
npm start ex2-config-push                 # CONFIG=central
node tools/edge-load.js --rps 300 --for 4
node tools/kill-config.js                 # config service band karke dekho

CONFIG=local npm start ex2-config-push
node tools/edge-load.js --rps 300 --for 4
node tools/kill-config.js
```

```
CONFIG=central  p50: 1370 ms   p99: 2427 ms   config calls: 16980   errors: 0%
config service DOWN → CONFIG=central: ok 0/60, fail 60/60

CONFIG=local    p50:    2 ms   p99:    5 ms   config calls: 0       errors: 0%
config service DOWN → CONFIG=local:   ok 60/60, fail 0/60
```

👉 Read path se ek network hop hatane se **latency aur availability dono** theek hote hain.

---

## ex3-early-drop — bura packet kahan roko

Ek hi flood (4,000 bad + 200 good per second), teen jagah drop:

| mode | drop kahan |
|---|---|
| `DROP=app` | body parse + business logic ke **baad** |
| `DROP=middleware` | headers ke turant baad, kaam se pehle |
| `DROP=edge` | TCP filter par (`services/edge-filter.js`) — application tak baat pahunchti hi nahi |

```bash
npm start ex3-early-drop                       # DROP=app
node tools/flood.js --bad 4000 --good 200 --for 3
DROP=middleware npm start ex3-early-drop && node tools/flood.js --bad 4000 --good 200 --for 3
DROP=edge npm start ex3-early-drop && node tools/flood.js --bad 4000 --good 200 --for 3
```

```
DROP=app        good served: 600   blocked: 12000 (edge 0 · app 12000)   app ne poora kaam kiya: 12600   throughput:  948/s
DROP=middleware good served: 600   blocked: 12000 (edge 0 · app 12000)   app ne poora kaam kiya:   600   throughput: 2571/s
DROP=edge       good served: 600   blocked: 12000 (edge 12000 · app 0)   app ne poora kaam kiya:   600   throughput: 3266/s
```

👉 Reject teeno mein hua. Farq sirf itna ki **reject karne se pehle kitna kaam ho chuka tha**.

---

## ex4-isolates-pool — density, pool aur ek maalik

```bash
npm start ex4-isolates-pool
SANDBOX=heavy node tools/tenants.js --tenants 500     # ya SANDBOX=heavy npm start … phir tool
SANDBOX=light node tools/tenants.js --tenants 500
node tools/pool.js --workers 4 --requests 2000
node tools/counter.js --clients 200
```

```
SANDBOX=heavy → 500 tenants: rss 1113 MB   cold start p50: 10.3 ms
SANDBOX=light → 500 tenants: rss  117 MB   cold start p50:  0.1 ms

per-worker pools → tcp connects: 32   handshake time: 576 ms   reused: 1968
shared pool      → tcp connects:  8   handshake time:  24 ms   reused: 1992

replicated (eventual) → expected 200, got 26   replicas: [26,24,22]   ❌ lost updates
single owner          → expected 200, got 200  ✅
```

👉 Teen alag sabak: **density** (isolate vs bhaari sandbox), **shared pool** (handshakes),
aur **ek maalik** (jab hazaron log ek hi state badal rahe hon).

---

## Ports

| Kya | Port |
|---|---|
| edge cities | 4201–4206 |
| config-service · edges | 4210 · 4211–4213 |
| edge-filter · guarded-service · uska stats | 4220 · 4221 · 4321 |
| runtime · origin | 4230 · 4231 |
