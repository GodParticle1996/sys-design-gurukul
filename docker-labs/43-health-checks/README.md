# 🐳 Lab 43 — Health checks: "sab theek?" poochhne wala hi sab na gira de

System Gurukul → **Health Checks** levels ka lab (🛡️ Playlist · 1 Resilience → 🩺 Health Checks). Zero dependency Node (18+).
Source video (credit): Software Developer Diaries — "The hidden cost of poorly-designed /health endpoints".
(Is lab ka pehla roop KubeGurukul ka `docker-labs/01-probes` hai. Yahan wahi cluster hai, naye tools ke saath.)

```bash
node tools/slowmo.js             # ex0 — slow motion 1: DB ki 5 s ki gadbad, paanch setup
                                 #       [--mode deep-live|deep-ready|cached|fail-open|shallow] [--fast]
node tools/slowmo-boot.js        #       slow motion 2: dheema boot   [--mode delay5|delay10|delay10-slow|startup] [--fast]
node tools/slowmo-stop.js        #       slow motion 3: band hona     [--mode turant|chhota|poora] [--fast]
node tools/mini.js               #       sabse chhota chalta program: ek app + lib/health.js (port 5229)
npm start ex1-deep-shallow → node tools/dbblip.js      # [--setup deep-live|deep-ready|cached|fail-open|shallow]
npm start ex2-probe-load   → node tools/probeload.js   # [--ready deep|cached|shallow]
npm start ex3-startup      → node tools/slowstart.js   # [--setup delay5|delay10|delay10-slow|startup]
npm start ex4-graceful     → node tools/rollout.js     # [--app turant|graceful]
docker compose --profile ex1-deep-shallow up --build   # (baaki exercises ke profile bhi)
```

| File | Kya hai |
|---|---|
| `lib/health.js` | **App ka hissa, 27 line**: `live()` ("zinda ho?") · `ready()` ("traffic bhejein?") · `stop()` (band hone ka signal) · optional `check` (dependency se poochhna — apni ghadi par, jawab yaad se). `services/pod.js` aur `tools/mini.js` yahi chalate hain. |
| `lib/checker.js` | **Checker ka niyam, 41 line**: ek probe ka nateeja aaya → kuch nahi / READY / NOT READY / restart. Lagataar fail ki ginti; startup pass hone tak baaki sawaal band. `services/cluster.js` aur teeno slow motion tools yahi chalate hain. |
| `services/cluster.js` | Chhota cluster: har pod ek **alag Node process**. Checker (kubelet jaisa) probes chalata hai; Service sirf READY pods ko bhejta hai (`failOpen: true` ho toh koi READY na hone par sab ko). Terminate hote pod ko 1 s tak aur traffic (khabar der se pahunchti hai). |
| `services/pod.js` | App: boot mein `STARTUP_MS` (tab tak port band) · `/livez` · `/readyz` (deep / cached / shallow) · `/home` (DB nahi chahiye) · `/orders` (DB chahiye) · SIGTERM par turant band ya 2 s tak jawab. |
| `services/db.js` | Shared DB. |
| `k8s/orders.yaml` | Wahi niyam asli Kubernetes ki bhasha mein. **Chala ke nahi dekhi gayi** (is machine par Kubernetes nahi hai). |
| `tools/terminus.js` | Wahi timeline jo `mini.js` mein hai, par npm ki library `@godaddy/terminus` ke saath (`npm install @godaddy/terminus` chahiye). |

**Asli Kubernetes nahi, niyam asli:** probes ke niyam (startup pass hone tak baaki band · `initialDelaySeconds` · `periodSeconds` · `timeoutSeconds` ·
`failureThreshold` · liveness / startup fail → restart · readiness fail → traffic band) wahi hain. ⏱️ Restart ke beech ka intezaar chhota kiya gaya hai:
0, 1, 2, 4 s (asli Kubernetes: 10, 20, 40 s … 5 minute tak).

Numbers ek laptop (WSL, Node v24.18.0) par 2026-10-10 ke runs ke hain. Slow motion tools aur `mini.js` mein ghadi tay hai — teen-teen run mein
output akshar-akshar wahi aaya. `dbblip.js` jaise asli raftaar wale tools ke number har run mein thode badalte hain; **tarteeb wahi rehti hai**.

Docker: `docker-compose.yml` pattern se likha gaya hai, par is machine par Docker nahi hai — compose file chala ke **nahi dekhi gayi**.

---

## ex0-slowmo — pehle yeh chalao

### Slow motion 1: DB ki 5 second ki gadbad

KhanaKart ki orders-service ke 3 pods aur ek shared DB. `/home` ko DB nahi chahiye; `/orders` ko chahiye. Checker har 1 s par har pod se do
sawaal poochhta hai: "zinda ho?" (lagataar 3 fail → restart, dobara boot 6 s) aur "traffic bhejein?" (1 fail → traffic band). DB 2.5 s se 7.5 s tak band.

```
$ node tools/slowmo.js --mode deep-live
3 pods (boot 6 s) · checker har 1 s par poochhta hai: "zinda ho?" (3 fail → restart) aur "traffic bhejein?" (1 fail → traffic band)
DB 2.50 s se 7.50 s tak band · har 0.5 s par ek /home (DB nahi chahiye) aur ek /orders (DB chahiye)

=== ek hi deep /healthz — "zinda ho?" aur "traffic bhejein?" dono DB se poochh ke ===
    0.00 s  🩺 zinda ho? ✓ ✓ ✓ · traffic bhejein? ✓ ✓ ✓
    0.25 s  /home ✓ (pod-1)                /orders ✓ (pod-2)
    0.75 s  /home ✓ (pod-3)                /orders ✓ (pod-1)
    1.00 s  🩺 zinda ho? ✓ ✓ ✓ · traffic bhejein? ✓ ✓ ✓
    1.25 s  /home ✓ (pod-2)                /orders ✓ (pod-3)
    1.75 s  /home ✓ (pod-1)                /orders ✓ (pod-2)
    2.00 s  🩺 zinda ho? ✓ ✓ ✓ · traffic bhejein? ✓ ✓ ✓
    2.25 s  /home ✓ (pod-3)                /orders ✓ (pod-1)
    2.50 s  💥 DB band
    2.75 s  /home ✓ (pod-2)                /orders ✗ (pod-3: DB nahi mila)
    3.00 s  🩺 zinda ho? ✗ ✗ ✗ (lagataar fail 1/3) · traffic bhejein? ✗ ✗ ✗
    3.00 s     → pod-1, pod-2, pod-3: traffic band (NOT READY)
    3.25 s  /home ✗ koi READY pod nahi     /orders ✗ koi READY pod nahi
    3.75 s  /home ✗ koi READY pod nahi     /orders ✗ koi READY pod nahi
    4.00 s  🩺 zinda ho? ✗ ✗ ✗ (lagataar fail 2/3) · traffic bhejein? ✗ ✗ ✗
    4.25 s  /home ✗ koi READY pod nahi     /orders ✗ koi READY pod nahi
    4.75 s  /home ✗ koi READY pod nahi     /orders ✗ koi READY pod nahi
    5.00 s  🩺 zinda ho? ✗ ✗ ✗ (lagataar fail 3/3) · traffic bhejein? ✗ ✗ ✗
    5.00 s     → pod-1, pod-2, pod-3: RESTART — dobara boot, 6 s lagenge
    5.25 s  /home ✗ koi READY pod nahi     /orders ✗ koi READY pod nahi
    5.75 s  /home ✗ koi READY pod nahi     /orders ✗ koi READY pod nahi
    6.00 s  🩺 zinda ho? — (restart ke baad 8 s tak nahi poochhta) · traffic bhejein? ✗ ✗ ✗ (port band: app boot ho raha hai)
    6.25 s  /home ✗ koi READY pod nahi     /orders ✗ koi READY pod nahi
    6.75 s  /home ✗ koi READY pod nahi     /orders ✗ koi READY pod nahi
    7.00 s  🩺 zinda ho? — (restart ke baad 8 s tak nahi poochhta) · traffic bhejein? ✗ ✗ ✗ (port band: app boot ho raha hai)
    7.25 s  /home ✗ koi READY pod nahi     /orders ✗ koi READY pod nahi
    7.50 s  ✅ DB wapas
    7.75 s  /home ✗ koi READY pod nahi     /orders ✗ koi READY pod nahi
    8.00 s  🩺 zinda ho? — (restart ke baad 8 s tak nahi poochhta) · traffic bhejein? ✗ ✗ ✗ (port band: app boot ho raha hai)
    8.25 s  /home ✗ koi READY pod nahi     /orders ✗ koi READY pod nahi
    8.75 s  /home ✗ koi READY pod nahi     /orders ✗ koi READY pod nahi
    9.00 s  🩺 zinda ho? — (restart ke baad 8 s tak nahi poochhta) · traffic bhejein? ✗ ✗ ✗ (port band: app boot ho raha hai)
    9.25 s  /home ✗ koi READY pod nahi     /orders ✗ koi READY pod nahi
    9.75 s  /home ✗ koi READY pod nahi     /orders ✗ koi READY pod nahi
   10.00 s  🩺 zinda ho? — (restart ke baad 8 s tak nahi poochhta) · traffic bhejein? ✗ ✗ ✗ (port band: app boot ho raha hai)
   10.25 s  /home ✗ koi READY pod nahi     /orders ✗ koi READY pod nahi
   10.75 s  /home ✗ koi READY pod nahi     /orders ✗ koi READY pod nahi
   11.00 s  🩺 zinda ho? — (restart ke baad 8 s tak nahi poochhta) · traffic bhejein? ✓ ✓ ✓
   11.00 s     → pod-1, pod-2, pod-3: traffic wapas (READY)
   11.25 s  /home ✓ (pod-1)                /orders ✓ (pod-2)
   11.75 s  /home ✓ (pod-3)                /orders ✓ (pod-1)
   12.00 s  🩺 zinda ho? — (restart ke baad 8 s tak nahi poochhta) · traffic bhejein? ✓ ✓ ✓
   12.25 s  /home ✓ (pod-2)                /orders ✓ (pod-3)
   12.75 s  /home ✓ (pod-1)                /orders ✓ (pod-2)
   13.00 s  🩺 zinda ho? ✓ ✓ ✓ · traffic bhejein? ✓ ✓ ✓
   nateeja → /home: 26 mein se 10 safal (fail: 3.25 s se 10.75 s tak) · /orders: 26 mein se 9 safal · restarts 3
             DB 7.50 s par wapas → /orders phir se safal: 11.25 s par (DB ke 3.75 s baad)
```

Paanchon setup (`node tools/slowmo.js`), har page par 26 requests:

| Setup | /home safal | /orders safal | Restart | /orders theek, DB ke baad |
|---|---|---|---|---|
| Ek hi deep `/healthz`: dono sawaal DB se poochh ke | 10 | 9 | 3 | 3.75 s |
| "Zinda ho?" seedha haan · "traffic bhejein?" DB se poochh ke | 16 | 15 | 0 | 0.75 s |
| "Traffic bhejein?" yaad se (app har 2 s par DB se poochhta hai) | 18 | 13 | 0 | 1.75 s |
| "Traffic bhejein?" DB se + load balancer fail open | **26** | 16 | 0 | 0.25 s |
| Dono sawaal DB ko chhute hi nahi; `/orders` khud 503 deta hai | **26** | 16 | 0 | 0.25 s |

👉 **Liveness mein DB**: DB 5 s band, par service 8 s band (3.00 s se 11.00 s): teeno pods restart hue aur DB ke lautne ke baad bhi boot ho rahe the.

👉 **Readiness mein shared DB**: restart nahi, par DB ke girte hi teeno pods ek saath traffic se bahar — `/home` bhi band, jise DB chahiye hi nahi.

👉 **Yaad rakha jawab** bill ghatata hai (ex2), "sab ek saath bahar" nahi: gadbad ka pata der se (5.00 s), theek hone ka bhi (9.00 s).

👉 **Do ilaaj**: DB ko health ke jawab se bahar rakho (`/orders` khud 503 de) — ya load balancer fail open kare.

### Slow motion 2: dheema boot

```
$ node tools/slowmo-boot.js
1 pod · "zinda ho?" har 2 s, 1 fail = restart · restart ke beech intezaar 0, 1, 2, 4 s (asli Kubernetes: 10, 20, 40 s …) · 25 s dekha

=== "zinda ho?" pod shuru hone ke 5 s baad se · boot 8 s ===
    0.00 s  ▶️ pod shuru — boot 8 s (8.00 s par khulega)
    5.00 s  🩺 zinda ho? ✗ (port band) → RESTART #1
    5.00 s  ▶️ pod shuru — boot 8 s (13.00 s par khulega)
   10.00 s  🩺 zinda ho? ✗ (port band) → RESTART #2 — 1 s ruk ke
   11.00 s  ▶️ pod shuru — boot 8 s (19.00 s par khulega)
   16.00 s  🩺 zinda ho? ✗ (port band) → RESTART #3 — 2 s ruk ke
   18.00 s  ▶️ pod shuru — boot 8 s (26.00 s par khulega)
   23.00 s  🩺 zinda ho? ✗ (port band) → RESTART #4 — 4 s ruk ke
   nateeja → pehli baar READY: kabhi nahi · restarts 4 · 25.00 s par: restart ka intezaar (CrashLoopBackOff)

=== "zinda ho?" 10 s baad se · boot 8 s ===
    0.00 s  ▶️ pod shuru — boot 8 s (8.00 s par khulega)
    8.00 s  🚪 app khul gaya (port chalu)
    8.00 s  🩺 traffic bhejein? ✓ → READY
   10.00 s  🩺 zinda ho? ✓ (aage har 2 s par)
   nateeja → pehli baar READY: 8.00 s · restarts 0 · 25.00 s par: chal raha hai, READY

=== "zinda ho?" 10 s baad se · aaj boot 12 s ===
    0.00 s  ▶️ pod shuru — boot 12 s (12.00 s par khulega)
   10.00 s  🩺 zinda ho? ✗ (port band) → RESTART #1
   10.00 s  ▶️ pod shuru — boot 12 s (22.00 s par khulega)
   20.00 s  🩺 zinda ho? ✗ (port band) → RESTART #2 — 1 s ruk ke
   21.00 s  ▶️ pod shuru — boot 12 s (33.00 s par khulega)
   nateeja → pehli baar READY: kabhi nahi · restarts 2 · 25.00 s par: abhi bhi boot ho raha hai — READY nahi

=== "shuru ho gaye?" wala sawaal (har 1 s, 30 fail tak chhoot) · boot 12 s ===
    0.00 s  ▶️ pod shuru — boot 12 s (12.00 s par khulega)
   12.00 s  🚪 app khul gaya (port chalu)
   12.00 s  🩺 shuru ho gaye? ✓ — pehle 12 baar ✗ (chhoot 30 tak; koi restart nahi) → ab baaki dono sawaal
   12.00 s  🩺 zinda ho? ✓ (aage har 2 s par)
   12.00 s  🩺 traffic bhejein? ✓ → READY
   nateeja → pehli baar READY: 12.00 s · restarts 0 · 25.00 s par: chal raha hai, READY
```

👉 "Kitne second baad se poochho" ek andaaza hai. Jis din boot us andaaze se lamba chala, checker app ko khulne se pehle maar deta hai — baar-baar.
Shuruaat ka alag sawaal ("shuru ho gaye?" = startup probe) andaaza nahi lagata.

### Slow motion 3: band hona

```
$ node tools/slowmo-stop.js
2 pods · har 0.25 s par ek request, baari-baari · 1.00 s par pod-old ko SIGTERM · load balancer ko khabar 1 s der se (2.00 s par)

=== SIGTERM par turant band ===
    0.10 s  #1  → pod-old ✓
    0.35 s  #2  → pod-new ✓
    0.60 s  #3  → pod-old ✓
    0.85 s  #4  → pod-new ✓
    1.00 s  🛑 pod-old ko SIGTERM — app usi pal band
    1.10 s  #5  → pod-old ✗ (port band: connection refused)
    1.35 s  #6  → pod-new ✓
    1.60 s  #7  → pod-old ✗ (port band: connection refused)
    1.85 s  #8  → pod-new ✓
    2.00 s  📋 load balancer ko khabar pahunchi: pod-old hata — ab sirf pod-new
    2.10 s  #9  → pod-new ✓
    2.35 s  #10 → pod-new ✓
    2.60 s  #11 → pod-new ✓
    2.85 s  #12 → pod-new ✓
    3.10 s  #13 → pod-new ✓
    3.35 s  #14 → pod-new ✓
   nateeja → 14 requests · 2 fail

=== SIGTERM ke baad 0.5 s tak jawab, phir band ===
    0.10 s  #1  → pod-old ✓
    0.35 s  #2  → pod-new ✓
    0.60 s  #3  → pod-old ✓
    0.85 s  #4  → pod-new ✓
    1.00 s  🛑 pod-old ko SIGTERM — app 0.5 s tak jawab deta rahega
    1.10 s  #5  → pod-old ✓
    1.35 s  #6  → pod-new ✓
    1.50 s  🚪 pod-old band (port band)
    1.60 s  #7  → pod-old ✗ (port band: connection refused)
    1.85 s  #8  → pod-new ✓
    2.00 s  📋 load balancer ko khabar pahunchi: pod-old hata — ab sirf pod-new
    2.10 s  #9  → pod-new ✓
    2.35 s  #10 → pod-new ✓
    2.60 s  #11 → pod-new ✓
    2.85 s  #12 → pod-new ✓
    3.10 s  #13 → pod-new ✓
    3.35 s  #14 → pod-new ✓
   nateeja → 14 requests · 1 fail

=== SIGTERM ke baad 2 s tak jawab, phir band ===
    0.10 s  #1  → pod-old ✓
    0.35 s  #2  → pod-new ✓
    0.60 s  #3  → pod-old ✓
    0.85 s  #4  → pod-new ✓
    1.00 s  🛑 pod-old ko SIGTERM — app 2 s tak jawab deta rahega
    1.10 s  #5  → pod-old ✓
    1.35 s  #6  → pod-new ✓
    1.60 s  #7  → pod-old ✓
    1.85 s  #8  → pod-new ✓
    2.00 s  📋 load balancer ko khabar pahunchi: pod-old hata — ab sirf pod-new
    2.10 s  #9  → pod-new ✓
    2.35 s  #10 → pod-new ✓
    2.60 s  #11 → pod-new ✓
    2.85 s  #12 → pod-new ✓
    3.00 s  🚪 pod-old band (port band)
    3.10 s  #13 → pod-new ✓
    3.35 s  #14 → pod-new ✓
   nateeja → 14 requests · 0 fail
```

👉 Requests tab girti hain jab port load balancer ko khabar pahunchne se **pehle** band ho jaaye. Khabar se zyada der tak jawab dete raho.

### mini.js — sabse chhota chalta program

```
$ node tools/mini.js
app :5229 · lib/health.js · DB ka check har 1 s par, jawab yaad se

    samay   /livez   /readyz   /home      kya hua
   0.25 s   200      200       200
   0.75 s   200      200       200
   1.25 s   200      200       200
   1.50 s                                  💥 DB band
   1.75 s   200      200       200         ← app ko abhi pata nahi: yaad 1.00 s ki hai
   2.25 s   200      503       200         ← 2.00 s par app ne DB se poochha
   2.75 s   200      503       200
   3.25 s   200      503       200
   3.75 s   200      503       200
   4.25 s   200      503       200
   4.50 s                                  ✅ DB wapas
   4.75 s   200      503       200         ← yaad 4.00 s ki hai
   5.25 s   200      200       200         ← 5.00 s par app ne DB se poochha
   5.75 s   200      200       200
   6.25 s   200      200       200
   6.50 s                                  🛑 SIGTERM — band hone ka signal
   6.75 s   200      503       200         ← traffic rukwaya; par jo request aayi, uska jawab diya
   7.25 s   200      503       200
   7.75 s   200      503       200
   8.25 s   200      503       200
   8.50 s                                  app band
```

### terminus.js — wahi timeline, asli library ke saath

`npm install @godaddy/terminus` (isi folder mein; Docker image mein yeh library nahi hai). Neeche ka output terminus 4.12.1 par aaya.

```
$ node tools/terminus.js
app :5229 · @godaddy/terminus · beforeShutdown: 2 s

    samay   /livez   /readyz   /home      kya hua
   0.25 s   200      200       200
   0.75 s   200      200       200
   1.25 s   200      200       200
   1.50 s                                  💥 DB band
   1.75 s   200      200       200
   2.25 s   200      503       200
   2.75 s   200      503       200
   3.25 s   200      503       200
   3.75 s   200      503       200
   4.25 s   200      503       200
   4.50 s                                  ✅ DB wapas
   4.75 s   200      503       200
   5.25 s   200      200       200
   5.75 s   200      200       200
   6.25 s   200      200       200
   6.50 s                                  🛑 SIGTERM — band hone ka signal
   6.75 s   503      503       200
   7.25 s   503      503       200
   7.75 s   503      503       200
   8.25 s   503      503       200
   8.50 s                                  app band

$ node tools/terminus.js --no-delay        # library ki default settings
app :5229 · @godaddy/terminus · default settings (beforeShutdown nahi)

    samay   /livez   /readyz   /home      kya hua
   0.25 s   200      200       200
   0.75 s   200      200       200
   1.25 s   200      200       200
   1.50 s                                  💥 DB band
   1.75 s   200      200       200
   2.25 s   200      503       200
   2.75 s   200      503       200
   3.25 s   200      503       200
   3.75 s   200      503       200
   4.25 s   200      503       200
   4.50 s                                  ✅ DB wapas
   4.75 s   200      503       200
   5.25 s   200      200       200
   5.75 s   200      200       200
   6.25 s   200      200       200
   6.50 s                                  🛑 SIGTERM — band hone ka signal
   6.50 s                                  app band
```

| Sawaal | `lib/health.js` | `@godaddy/terminus` |
|---|---|---|
| Band hote waqt `/livez` | 200 | **503** (band hote waqt har health raasta 503) |
| Dependency ka jawab yaad rehta hai? | haan (`check`, `everyMs`) | nahi — khud rakho |
| Band hone se pehle rukna | 2 s (`mini.js`) | default: **nahi** (`beforeShutdown` likhna padta hai) |

---

## ex1-deep-shallow — DB ki 5 second ki gadbad, asli raftaar

3 pods (boot 6 s). 40/s `/home` + 40/s `/orders`, 22 s. DB t=6 s se t=11 s tak band.

```
$ node tools/dbblip.js
3 pods (boot 6 s) · 40/s /home + 40/s /orders · 22 s · DB t=6s–11s band

probe setup                        /home safal   /home (DB band ke dauraan)   /orders safal   pod restarts   DB wapas → /orders theek
liveness DB check karta hai           59.0%           19.5%                  54.5%          3           5.0 s baad
sirf readiness DB check karta hai     77.3%           19.5%                  72.8%          0           0.9 s baad
readiness yaad se (DB har 2 s)        72.6%           39.5%                  63.6%          0           3.0 s baad
readiness DB check + LB fail-open    100.0%          100.0%                  77.3%          0           0.0 s baad
dono shallow, app khud degrade       100.0%          100.0%                  77.3%          0           0.0 s baad
```

**Teen run ka dayra:**

| Setup | /home safal, DB band ke dauraan | Restart | /orders theek, DB ke baad |
|---|---|---|---|
| liveness DB check karta hai | 19.0–19.5% | 3 | 4.0–5.0 s |
| sirf readiness DB check karta hai | 17.5–19.5% | 0 | 0.9 s |
| readiness yaad se (DB har 2 s) | 39.5% | 0 | 2.0–3.0 s |
| readiness DB check + LB fail-open | **100%** | 0 | 0.0 s |
| dono shallow, app khud degrade | **100%** | 0 | 0.0 s |

👉 **Liveness DB check karta hai**: 3 restart. DB 11 s par wapas, par pods boot ho rahe the → `/orders` DB ke 4.0–5.0 s baad theek.

👉 **Sirf readiness DB check karta hai**: restart nahi, par DB band ke dauraan `/home` sirf 17.5–19.5% safal — pods theek the, bas load
balancer ko koi pod READY nahi dikha. (Jo requests safal hui, woh gadbad ke pehle second ki hain: checker ko pata chalne se pehle.)

👉 **Readiness yaad se**: `/home` thodi der aur chali (39.5%), par wapsi der se: DB ke 2.0–3.0 s baad.

👉 **Fail open** aur **dono shallow**: `/home` 100%. `/orders` sirf DB band rehne ke dauraan fail (yeh hona hi tha), aur DB aate hi theek.

## ex2-probe-load — health ke sawaalon ka bill

5 pods. Har pod ka `/readyz` har second **4 jagah** se: kubelet, load balancer, service mesh, monitoring. App ka asli traffic zero.

```
$ node tools/probeload.js
5 pods · har pod ka /readyz har second 4 baar (kubelet + LB + mesh + monitoring) · 10 s · app traffic 0

readiness                        DB queries/second (sirf probes se)   100 pods par (andaaza)
deep — har probe par DB                18.5                            370
cached — har 2 s ek DB check            2.5                            50
shallow — DB nahi                       0.0                            0
```

👉 Bina ek bhi user ke DB par 18.5 queries/second (100 pods par andaaza: ~370). Yaad se: 2.5 (~50).
Aur jab DB pehle se dheema ho, deep probes usi DB par aur bojh daalte hain.

## ex3-startup — dheema boot aur `startupProbe`

1 pod. livenessProbe: har 2 s, **ek fail = restart**. 25 s dekha.

```
$ node tools/slowstart.js
1 pod · 25 s dekha · liveness har 2 s, ek fail = restart · CrashLoopBackOff 0, 1, 2, 4 s (asli: 10, 20, 40 s …)

setup                                  pehli baar READY   restarts   25 s par haal
liveness delay 5 s, boot 8 s           kabhi nahi          4     CrashLoopBackOff
liveness delay 10 s, boot 8 s               8.1 s          0     Running, READY
liveness delay 10 s, boot 12 s         kabhi nahi          2     Running, NOT READY
startupProbe (1 s × 30), boot 12 s         12.1 s          0     Running, READY
```

👉 Slow motion 2 jaisa hi dhancha, asli pod processes ke saath: delay 5 s → 4 restart, kabhi READY nahi · delay 10 s chal gaya ·
boot 12 s hua toh 2 restart · `startupProbe` → READY 12.1 s, 0 restart.

## ex4-graceful — deploy aur SIGTERM

3 pods, ek-ek karke badle gaye (maxSurge 1, maxUnavailable 0), 100 req/s `/home`. Service ko khabar ~1 s der se.

```
$ node tools/rollout.js
3 pods · rolling restart (maxSurge 1) · 100 req/s /home · Service ko khabar ~1 s der se

SIGTERM par app kya karta hai                 requests   fail   rollout mein laga
turant exit                                     1018     75     6.2 s
readiness 503 + 2 s drain, phir exit            1018      0     6.2 s
```

👉 **Turant exit**: har deploy par 75 requests fail. **2 s tak jawab dete rehna**: 0.
Is cluster mein Service terminate hote pod ko 1 s tak traffic bhejta rehta hai chahe `/readyz` kuch bhi kahe — errors ko 0 jo cheez karti hai, woh
**khabar pahunchne tak jawab dete rehna** hai.

---

## Asli setups mein (documentation se — is lab mein chalaye nahi gaye)

- **Kubernetes** (probes ke defaults): `periodSeconds` 10 · `timeoutSeconds` 1 · `failureThreshold` 3 · `initialDelaySeconds` 0 ·
  `terminationGracePeriodSeconds` 30. HTTP status 200–399 pass. Startup probe ho toh uske pass hone tak liveness / readiness nahi chalte.
  Pod ko traffic ki list se hatana aur pod ko band karna ek saath shuru hote hain → `preStop: sleep`. YAML: `k8s/orders.yaml`.
- **AWS Application Load Balancer** (health check defaults): har 30 s · timeout 5 s · 2 fail → unhealthy · 5 pass → healthy · sirf 200 pass.
  Saare targets unhealthy → sab ko bhejta hai (fail open).
- **Envoy**: healthy hosts panic threshold (default 50%) se kam → health ko andekha karta hai.
- **Spring Boot Actuator**: `/actuator/health/liveness`, `/actuator/health/readiness`. Documentation: liveness bahar ki cheezon par nirbhar na ho;
  readiness mein shared cheez rakhna ek "judgement call" hai.

## ⚠️ Aam galatfehmi

- **"Health check jitna gehra, utna achha."** Liveness mein DB → 3 restart, `/orders` DB ke 4.0–5.0 s baad theek.
- **"Restart se zyadatar gadbad theek ho jaati hai."** Sirf pod ke andar ki. DB ki gadbad par restart ne outage lamba kiya.
- **"Jawab yaad rakh lo, toh shared DB wali dikkat khatam."** Bill ghata (18.5 → 2.5 q/s); saare pods phir bhi ek saath bahar.
- **"initialDelaySeconds badha do."** Andaaza hai: boot 12 s hua toh 2 restart.
- **"/readyz 503 kar diya, ab turant band ho sakte hain."** Khabar pahunchne mein waqt lagta hai: turant band → 75 fail har deploy.

## Khud try karo

1. `tools/slowmo.js` mein `LIVE_FAILS` 3 se 6 karo. `--mode deep-live` mein restart hote hain? DB kitni der band rahe toh honge?
2. `tools/slowmo.js` mein `CACHE_FIRST` 200 se 1900 karo. `--mode cached` mein pods kab bahar gaye, kab laute? (Yaad ki ghadi ka asar.)
3. `tools/slowmo-stop.js` mein `LAG` 1000 se 3000 karo. Ab `--mode poora` (2 s tak jawab) mein kitni requests fail hui?
4. `lib/health.js` mein `live()` ke andar `depOk` lauta do (yaani liveness mein DB). `node tools/mini.js` mein `/livez` wala khaana kaise badla — aur
   asli cluster mein iska matlab kya hota?
5. `tools/dbblip.js` mein liveness probe ko `failureThreshold: 10` do (jahan `initialDelaySeconds: 8` likha hai, wahin). `deep-live` wali row mein restart ab bhi hote hain?
