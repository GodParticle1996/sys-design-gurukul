# 🐳 Lab 42 — Chaos engineering: jaan-boojh kar todo, taaki kami pehle dikhe

System Gurukul → 🛡️ Resilience → **Chaos Engineering** levels ka lab. Zero dependency Node (18+).
Source video (credit): Software Developer Diaries — "The Secret Weapon Behind Resilient Distributed Systems" (Netflix ka Chaos Monkey).

**Kahani.** Ek team bolti hai: "humare paas 3 copies hain, ek mar bhi jaaye toh kuch nahi hoga." Kisi ne kabhi check nahi kiya.
Pehla asli check raat ke 2 baje, production mein, galti se hota hai.
Chaos engineering = wahi check **jaan-boojh kar**: chhota, din ke ujaale mein, pehle se likhe andaaze (hypothesis) ke saath, aur ek "band karo" button ke saath.

```bash
node tools/slowmo.js             # ex0 — slow motion 1: ek instance mara      [--mode one|three|health|retry] [--fast]
node tools/slowmo-faults.js      #       slow motion 2: har chot alag kami    [--mode crash|slow-hc|slow|zombie-hc|zombie|eject] [--fault crash|slow|zombie] [--fast]
node tools/slowmo-experiment.js  #       slow motion 3: prayog, aur band karne ka button   [--mode abort|no-abort|holds|refuse] [--fast]
node tools/mini.js               #       sabse chhota prayog: lib/monkey.js + lib/experiment.js (koi service nahi, koi port nahi)
npm start ex1-monkey      → node tools/monkey.js      # [--setup one|three|health|retry] [--seed N]
npm start ex2-faults      → node tools/faults.js      # [--fault crash|slow|zombie] [--setup hc|retry|eject]
npm start ex3-experiment  → node tools/experiment.js  # [--fault zombie|slow|crash]
docker compose --profile ex1-monkey up --build        # (ex2-faults, ex3-experiment ke profile bhi)
```

Ports: load balancer 5211 · app instances 5212–5214. `--fast` = slow motion ka asli waqt wala intezaar chhodta hai (output akshar-akshar wahi aata hai); `--mode` = sirf ek section.

| File | Kya hai |
|---|---|
| `lib/experiment.js` | **Prayog ka dhancha, 39 line** (line 14–52): `runExperiment({ measure, hypothesis, inject, rollback, watchMs, everyMs, abortIf, sleep })`. Pehle naapo → hypothesis → ek fault → har `everyMs` par naapo → `abortIf` ho toh roko → `rollback` (hamesha) → faisla. `sleep` bahar se aata hai, isliye slow motion mein nakli ghadi chalti hai aur `tools/experiment.js` mein asli. |
| `lib/monkey.js` | **Monkey, 20 line** (line 9–28): random target chuno, `kill(target)` bulao. `random` bahar se aata hai (tay beej wala ho sakta hai). `start()` / `stop()` = "har N ms par". |
| `lib/rotation.js` | **Load balancer ka rotation-niyam, 83 line**: baari-baari · health check (2 fail → bahar, 1 pass → wapas) · retry (agle instance par ek baar) · passive ejection (N lagataar fail → kuch der bahar). `services/lb.js` aur teeno slow motion tools yahi chalate hain. |
| `services/app.js` | App instance: `/work` (10 ms) · `/health` · `POST /fault { type, ms }` — `kill` (connection toot-te hain) · `slow` (`/work` 2 s leta hai, `/health` tez) · `zombie` (`/health` 200, `/work` 500) · `none` (rollback). Purana `POST /kill` bhi chalta hai. |
| `services/lb.js` | Load balancer ka asli server: setting `instances` · `health` · `retry` · `eject` (naya; 0 = band). `GET /work`, `POST /config` (jo setting nahi bheji woh default par), `GET /stats`. Timeout 500 ms. |
| `tools/slowmo.js` · `tools/slowmo-faults.js` · `tools/slowmo-experiment.js` | **Slow motion** (ex0): nakli services, tay ghadi, har event ki ek line. `lib/rotation.js` aur `lib/experiment.js` wahi hain jo asli services chalati hain. Koi service nahi chalani. |
| `tools/mini.js` | Sabse chhota chalta prayog: 3 nakli instances + `lib/monkey.js` + `lib/experiment.js`. App ka hissa line 5–53. |
| `tools/monkey.js` · `tools/faults.js` · `tools/experiment.js` | **Asli raftaar** (ex1, ex2, ex3): asli services par 100 req/s. `--seed N` se monkey ke victim dohraye ja sakte hain. |
| `tools/seeded.js` | Tay beej wala random (lab 41 wali file). |

**Asli kya hai, nakli kya.** `services/app.js` aur `services/lb.js` asli Node processes hain, asli timers aur asli HTTP ke saath.
Slow motion tools mein sirf ghadi tay hai; niyam wahi hain — `lib/rotation.js` aur `lib/experiment.js` seedhe `require` hote hain, alag "samjhane wali copy" nahi.
⏱️ Time chhota kiya gaya hai: health check har 300 ms, passive ejection 2 s, fault 4 s. Asli systems mein yeh bahut bade hote hain (neeche "Asli tools mein").

Numbers ek laptop (WSL, Node v24.18.0) par 2026-10-10 ke runs ke hain (`experiment.js --fault slow` wale run: 2026-10-11). Slow motion tools aur `mini.js` mein ghadi aur random tay hain — teen-teen run mein output akshar-akshar wahi aaya.
`monkey.js`, `faults.js`, `experiment.js` asli raftaar wale tools hain: unke number har run mein thode badal sakte hain (laptop par doosre kaam bhi chal rahe ho sakte hain); **tarteeb wahi rehti hai**, isliye neeche dayra diya hai.

Docker: `docker-compose.yml` pattern se likha gaya hai, par is machine par Docker nahi hai — compose file chala ke **nahi dekhi gayi**.

---

## ex0-slowmo — pehle yeh chalao

### Slow motion 1: ek instance mara

KhanaKart ka load balancer baari-baari requests bhejta hai — har 0.2 s par ek. Instance 2 1.00 s par mar jaata hai (connection turant toot-ta hai) aur 3.00 s par wapas aata hai.
Health check har 0.3 s par har instance se `/health` poochhta hai: 2 baar fail → rotation se bahar, 1 baar theek → wapas.

```
$ node tools/slowmo.js --mode health
har 0.2 s par ek request, baari-baari · 1.00 s par instance 2 mara, 3.00 s par wapas (jahan sirf ek instance hai, wahi marta hai) · health check har 0.3 s par

=== 3 instances + health check ===
    0.20 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓
    0.25 s  #1  → instance 1 ✓
    0.45 s  #2  → instance 2 ✓
    0.50 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓
    0.65 s  #3  → instance 3 ✓
    0.80 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓
    0.85 s  #4  → instance 1 ✓
    1.00 s  💥 instance 2 mar gaya
    1.05 s  #5  → instance 2 ✗ (connection toota)
    1.10 s  🩺 health: 1 ✓ · 2 ✗ (1/2) · 3 ✓
    1.25 s  #6  → instance 3 ✓
    1.40 s  🩺 health: 1 ✓ · 2 ✗ (2/2) · 3 ✓
    1.40 s     → instance 2: rotation se BAHAR
    1.45 s  #7  → instance 1 ✓
    1.65 s  #8  → instance 3 ✓
    1.70 s  🩺 health: 1 ✓ · 2 ✗ · 3 ✓
    1.85 s  #9  → instance 1 ✓
    2.00 s  🩺 health: 1 ✓ · 2 ✗ · 3 ✓
    2.05 s  #10 → instance 3 ✓
    2.25 s  #11 → instance 1 ✓
    2.30 s  🩺 health: 1 ✓ · 2 ✗ · 3 ✓
    2.45 s  #12 → instance 3 ✓
    2.60 s  🩺 health: 1 ✓ · 2 ✗ · 3 ✓
    2.65 s  #13 → instance 1 ✓
    2.85 s  #14 → instance 3 ✓
    2.90 s  🩺 health: 1 ✓ · 2 ✗ · 3 ✓
    3.00 s  ✅ instance 2 wapas chalu
    3.05 s  #15 → instance 1 ✓
    3.20 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓
    3.20 s     → instance 2: rotation mein WAPAS
    3.25 s  #16 → instance 2 ✓
    3.45 s  #17 → instance 3 ✓
    3.50 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓
    3.65 s  #18 → instance 1 ✓
    3.80 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓
    3.85 s  #19 → instance 2 ✓
    4.05 s  #20 → instance 3 ✓
    4.10 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓
    4.25 s  #21 → instance 1 ✓
    4.40 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓
    4.45 s  #22 → instance 2 ✓
    4.65 s  #23 → instance 3 ✓
    4.70 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓
    4.85 s  #24 → instance 1 ✓
    5.00 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓
    5.05 s  #25 → instance 2 ✓
   nateeja → 25 requests · 1 fail · sabse lamba lagataar fail: 1 · retry se bachi: 0
             instance 2 rotation se bahar: 1.40 s par · wapas: 3.20 s par
```

Chaaron setup (`node tools/slowmo.js`), 25 requests:

| Setup | Requests | Fail | Sabse lamba lagataar fail | Retry ne bachayi | Instance 2 rotation se bahar | Wapas |
|---|---|---|---|---|---|---|
| 1 instance — wahi mar jaata hai | 25 | 10 | 10 | 0 | health check nahi | — |
| 3 instances, health check nahi | 25 | 4 | 1 | 0 | health check nahi | — |
| 3 instances + health check | 25 | 1 | 1 | 0 | 1.40 s | 3.20 s |
| 3 instances + health check + retry | 25 | 0 | 0 | 1 | 1.40 s | 3.20 s |

👉 **1 instance**: 10 fail, saari lagataar (10). Poore 2 second ka andhera.

👉 **3 instances, health check nahi**: 4 fail — par kabhi do lagataar nahi (sabse lamba daur 1). Har teesri request mara hua instance maangti hai. Dashboard par "thoda noise", asli user ko error.

👉 **+ health check**: sirf 1 fail. Instance 2 1.00 s par mara, par rotation se 1.40 s par gaya — beech ki yeh **detection window** hai. Us window mein ek request mare hue instance par gayi.

👉 **+ retry**: 0 fail. Wahi request ab agle instance par dobara gayi aur safal hui (retry ne 1 request bachayi).

### Slow motion 2: har chot alag kami dikhati hai

Wahi system. Ab instance 2 par 1.00 s se 3.00 s tak teen alag tarah ki kharabi. Har request ke saath uska samay (ms) bhi chhapta hai. Load balancer ka timeout 0.5 s.

- `crash` — connection turant toot-ta hai (`/health` bhi fail).
- `slow` — `/work` 2 s leta hai, timeout se bahut zyada. `/health` tez hai, ✓ deta hai.
- `zombie` — `/work` turant 500 deta hai. `/health` phir bhi ✓.

```
$ node tools/slowmo-faults.js --mode eject
3 instances · har 0.2 s par ek request, baari-baari · 1.00 s se 3.00 s tak instance 2 par fault · timeout 0.5 s · health check har 0.3 s par

=== slow — /work 2 s leta hai, /health tez · health check + retry + passive ejection (2 lagataar fail → 2.00 s bahar) ===
    0.20 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓
    0.25 s  #1  → instance 1 ✓                                             10 ms
    0.45 s  #2  → instance 2 ✓                                             10 ms
    0.50 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓
    0.65 s  #3  → instance 3 ✓                                             10 ms
    0.80 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓
    0.85 s  #4  → instance 1 ✓                                             10 ms
    1.00 s  💥 instance 2 par slow fault shuru
    1.05 s  #5  → instance 2 ✗ timeout → dobara instance 3 ✓              510 ms
    1.10 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓
    1.25 s  #6  → instance 3 ✓                                             10 ms
    1.40 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓
    1.45 s  #7  → instance 1 ✓                                             10 ms
    1.65 s  #8  → instance 2 ✗ timeout → dobara instance 3 ✓              510 ms
    1.70 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓
    1.85 s  #9  → instance 3 ✓                                             10 ms
    2.00 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓
    2.05 s  #10 → instance 1 ✓                                             10 ms
    2.15 s  ⏏️ instance 2: 2 request lagataar fail → 2.00 s ke liye BAHAR (passive ejection)
    2.25 s  #11 → instance 3 ✓                                             10 ms
    2.30 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓
    2.45 s  #12 → instance 1 ✓                                             10 ms
    2.60 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓
    2.65 s  #13 → instance 3 ✓                                             10 ms
    2.85 s  #14 → instance 1 ✓                                             10 ms
    2.90 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓
    3.00 s  ✅ instance 2 theek
    3.05 s  #15 → instance 3 ✓                                             10 ms
    3.20 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓
    3.25 s  #16 → instance 1 ✓                                             10 ms
    3.45 s  #17 → instance 3 ✓                                             10 ms
    3.50 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓
    3.65 s  #18 → instance 1 ✓                                             10 ms
    3.80 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓
    3.85 s  #19 → instance 3 ✓                                             10 ms
    4.05 s  #20 → instance 1 ✓                                             10 ms
    4.10 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓
    4.15 s  ⏏️ instance 2: 2.00 s poore → rotation mein WAPAS (phir se try hoga)
    4.25 s  #21 → instance 2 ✓                                             10 ms
    4.40 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓
    4.45 s  #22 → instance 3 ✓                                             10 ms
    4.65 s  #23 → instance 1 ✓                                             10 ms
    4.70 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓
    4.85 s  #24 → instance 2 ✓                                             10 ms
    5.00 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓
    5.05 s  #25 → instance 3 ✓                                             10 ms
   nateeja → 25 requests · 0 fail · retry se bachi: 2 · sabse dheemi request: 510 ms · kharab instance tak pahunchi: 2
             health check ne instance 2 ko bahar kiya: kabhi nahi · passive ejection ne: 2.15 s par
```

Chhe mode (`node tools/slowmo-faults.js`), 25 requests:

| Mode | Fault · setup | Fail | Retry ne bachayi | Sabse dheemi request | Kharab instance tak pahunchi | Health check ne bahar kiya | Passive ejection ne |
|---|---|---|---|---|---|---|---|
| `crash` | crash · health check + retry | 0 | 1 | 11 ms | 1 | 1.40 s | kabhi nahi |
| `slow-hc` | slow · sirf health check | 4 | 0 | 500 ms | 4 | kabhi nahi | kabhi nahi |
| `slow` | slow · health check + retry | 0 | 4 | 510 ms | 4 | kabhi nahi | kabhi nahi |
| `zombie-hc` | zombie · sirf health check | 4 | 0 | 10 ms | 4 | kabhi nahi | kabhi nahi |
| `zombie` | zombie · health check + retry | 0 | 4 | 20 ms | 4 | kabhi nahi | kabhi nahi |
| `eject` | slow · health check + retry + passive ejection (2 lagataar fail → 2.00 s bahar) | 0 | 2 | 510 ms | 2 | kabhi nahi | 2.15 s |

👉 **crash**: health check ne instance 2 ko 1.40 s par bahar kiya. Retry ne beech ki 1 request bachayi → 0 fail. Yahi "aasaan" case hai.

👉 **slow, sirf health check** (`slow-hc`): health check ko kuch pata nahi chala — `/health` ✓ tha. Instance 2 par gayi har request (4) timeout par fail hui, har ek 500 ms ka intezaar.

👉 **zombie, sirf health check** (`zombie-hc`): wahi — 4 fail. Health check ✓ ✓ ✓ bolta raha.

👉 **retry ke saath** (`slow`, `zombie`): 0 fail — par retry kharabi **chhupa** deta hai, hataata nahi. `slow` mein retry hui har request ko timeout jitna intezaar karna pada (510 ms); `zombie` mein bas ek koshish aur (20 ms). Instance 2 tak abhi bhi 4 requests ja rahi hain.

👉 **passive ejection** (`eject`): instance 2 ki 2 requests lagataar fail hone par (2.15 s par) load balancer ne instance 2 ko khud bahar kiya — `/health` ✓ hone ke bawajood. Instance 2 tak sirf 2 requests gayi (4 ki jagah). Do cheezein dhyaan se dekho: (1) failure ka pata request poori hone par chalta hai — slow mein timeout ke baad (2.15 s par), zombie mein turant (1.66 s par, `--fault zombie` ke saath); (2) theek toh instance 2 3.00 s par ho gaya, par rotation mein 4.15 s par wapas aaya — ejection ka kharcha.
(`--fault zombie` ke saath: instance 2 tak 2 requests gayi, 0 fail.)

### Slow motion 3: prayog, aur band karne ka button

Wahi system: 3 instances, health check. Prayog `lib/experiment.js` chalata hai, 2.00 s par shuru:

1. **steady state naapo**: pichhle 1 s ki requests mein safal % (`measure`).
2. **hypothesis**: fault ke dauraan kam se kam 90% safal (`hypothesis`).
3. **fault lagao**: instance 2 zombie (`inject`).
4. **dekho**: har 1 s par dobara naapo, 4 s tak (`everyMs`, `watchMs`).
5. **abort rule**: 70% se neeche gaye toh turant roko (`abortIf`).
6. **rollback** (hamesha) → **faisla** (verdict).

```
$ node tools/slowmo-experiment.js --mode abort
3 instances, baari-baari, har 0.2 s par ek request · prayog 2.00 s par · hypothesis ≥ 90% safal · abort rule < 70% · fault 4 s tak dekhna

=== sirf health check · abort rule laga hai ===
    0.20 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓
    0.25 s  #1  → instance 1 ✓
    0.45 s  #2  → instance 2 ✓
    0.50 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓
    0.65 s  #3  → instance 3 ✓
    0.80 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓
    0.85 s  #4  → instance 1 ✓
    1.05 s  #5  → instance 2 ✓
    1.10 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓
    1.25 s  #6  → instance 3 ✓
    1.40 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓
    1.45 s  #7  → instance 1 ✓
    1.65 s  #8  → instance 2 ✓
    1.70 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓
    1.85 s  #9  → instance 3 ✓
    2.00 s  🔬 prayog shuru — pehle naapo, hypothesis: kam se kam 90% safal
    2.00 s  📏 naap: pichhle 1 s mein 5 requests, 5 safal = 100%
    2.00 s  💥 inject: instance 2 zombie bana (/health ✓, /work 500)
    2.00 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓
    2.05 s  #10 → instance 1 ✓
    2.25 s  #11 → instance 2 ✗ jawab 500
    2.30 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓
    2.45 s  #12 → instance 3 ✓
    2.60 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓
    2.65 s  #13 → instance 1 ✓
    2.85 s  #14 → instance 2 ✗ jawab 500
    2.90 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓
    3.00 s  📏 naap: pichhle 1 s mein 5 requests, 3 safal = 60%
    3.00 s  🛑 60% < 70% — abort rule lagi
    3.00 s  ↩️ rollback: instance 2 theek kiya
    3.00 s  📋 faisla: ABORT
    3.05 s  #15 → instance 3 ✓
    3.20 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓
    3.25 s  #16 → instance 1 ✓
    3.45 s  #17 → instance 2 ✓
    3.50 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓
    3.65 s  #18 → instance 3 ✓
    3.80 s  🩺 health: 1 ✓ · 2 ✓ · 3 ✓
    3.85 s  #19 → instance 1 ✓
   nateeja → faisla: ABORT (roka: 1.00 s par) · fault 1.00 s chala · fail hui requests (blast radius): 2
             steady state 100% · sabse kharab naap 60% · naap liye: 1 · retry se bachi: 0
```

Chaaron mode (`node tools/slowmo-experiment.js`):

| Mode | Faisla (verdict) | Fault kitni der chala | Fail hui requests (blast radius) | Steady → sabse kharab naap | Retry ne bachayi |
|---|---|---|---|---|---|
| `abort` — sirf health check · abort rule laga hai | **ABORT** (1.00 s par) | 1.00 s | 2 | 100% → 60% | 0 |
| `no-abort` — sirf health check · abort rule nahi | **hypothesis toota** | 4.00 s | 7 | 100% → 60% | 0 |
| `holds` — health check + retry · abort rule laga hai | **hypothesis tika** | 4.00 s | 0 | 100% → 100% | 7 |
| `refuse` — sirf health check · instance 3 pehle se zombie | **shuru hi mat karo** | kabhi nahi lagaya | 0 | 60% → — | 0 |

👉 **abort**: pehle hi naap par 60% aaya, abort rule lagi, fault 1.00 s mein hata diya. Nuksan (blast radius): 2 requests.

👉 **no-abort**: wahi fault, par rokne wala koi niyam nahi — fault poore 4.00 s chala, 7 requests fail. Hypothesis dono mein toot-ti hai; farak yeh hai ki kitna nuksan hua.

👉 **holds**: health check + retry ke saath wahi fault — har naap 100%, `hypothesis tika`, 0 fail. Par dhyaan: 7 requests ko retry ki zaroorat padi. "Tika" ka matlab "success % tika" hai, "kuch nahi hua" nahi.

👉 **refuse**: instance 3 **pehle se** zombie tha, kisi ne dekha nahi. Steady state hi 60% aaya → faisla `shuru hi mat karo`; fault lagaya hi nahi. Kharab system par prayog karoge toh nateeje par bharosa nahi.

### mini.js — sabse chhota chalta prayog

3 nakli instances, ek dus-line ka baari-baari caller, `lib/monkey.js` (ek instance maarta hai, beej 7) aur `lib/experiment.js`. Koi service nahi, koi port nahi, ghadi nakli (line 5–53 = jo tum apne app mein likhoge).

```
$ node tools/mini.js
3 nakli instances, baari-baari · hypothesis: kam se kam 95% safal · abort rule: 80% se neeche · monkey (beej 7)

              steady  fault             t=1 s  t=2 s  t=3 s   faisla
retry nahi      100%  instance 1 mara     65%      —      —   ABORT (1000 ms par roka)
retry hai       100%  instance 1 mara    100%   100%   100%   hypothesis tika

faisla: ABORT = abort rule lagi, fault turant hataya · hypothesis tika = fault ke dauraan bhi hypothesis sach
       hypothesis toota = fault poora chala, hypothesis jhooti · shuru hi mat karo = steady state hi kharab tha
```

👉 **retry nahi**: steady state 100%, monkey ne instance 1 maara, pehle hi naap par 65% → ABORT (1000 ms par). **retry hai**: wahi monkey, wahi instance — har naap 100%, hypothesis tika.

---

## ex1-monkey — chaos monkey: har 4 s ek random instance

Monkey (`lib/monkey.js`) har 4 s par ek **random** instance maarta hai; instance 2 s mein wapas aata hai (jaise orchestrator ne naya container utha diya). 100 req/s, 16 s — monkey 3 baar maarta hai (4, 8, 12 s). Setup badalte hain, monkey wahi karta hai; dekho kaunsi kami pakdi jaati hai.

```
$ node tools/monkey.js
🐒 har 4 s ek random instance maara (2 s mein wapas) · 100 req/s · 16 s · beej: nahi (victim random)

setup                              safal          fail   sabse lamba error ka daur   monkey ne maara
1 instance                         62.25%      604          2009 ms             #1 #1 #1
3 instances, health check nahi     87.44%      201             0 ms             #1 #3 #3
3 + health check                   97.13%       46             0 ms             #2 #1 #1
3 + health check + retry          100.00%        0             0 ms             #2 #1 #3
```

**Teen run ka dayra** (kaun sa instance mara — har run mein alag; bina `--seed` ke):

| Setup | Safal | Fail | Sabse lamba error ka daur |
|---|---|---|---|
| 1 instance | 62.25–62.31% | 603–604 | 2000–2009 ms |
| 3 instances, health check nahi | 87.44% | 201 | 0 ms |
| 3 + health check | 97.13–97.25% | 44–46 | 0 ms |
| 3 + health check + retry | 100.00% | 0 | 0 ms |

👉 **1 instance**: har maut = poore 2 second ka andhera. 2000–2009 ms lagataar errors, 603–604 fail. Monkey ne pehle hi din bata diya: yeh single point of failure hai.

👉 **3 instances, bina health check**: "humare paas 3 copies hain" — par load balancer mare hue instance ko bhi har teesri request bhejta raha → 201 fail (87.4% safal). Errors bikhre hue (lagataar daur 0 ms) — isliye dashboard par "thoda noise".

👉 **+ health check**: mare hue instance ko do health check fail hote hi rotation se bahar — 300 se 600 ms ke beech (do check, 300 ms ke gap par; phase par nirbhar). Sirf us window ki requests fail: 44–46.

👉 **+ retry**: window ki bhi fail request agle instance par dobara → 0 fail.

🔁 **`--seed 3`**: har setup mein monkey ne wahi instance wahi tarteeb se maare: `#3 #1 #2` (do run mein aur teeno 3-instance setup mein). Bina `--seed` ke tarteeb badalti hai: `#1 #2 #2 | #1 #3 #3 | #2 #1 #2` (teen run, ek setup).

---

## ex2-faults — har chot alag kami (asli raftaar)

Instance 2 par ek fault 3 s se 7 s tak (4 s), 100 req/s, kul 10 s. Teen fault × teen setup. **Sab number fault ke 4 s ke dauraan shuru hui requests ke hain** (lagbhag 400 requests, jinme se 133 ke aas-paas instance 2 ke hisse ki).

- Setup `hc` = sirf health check · `retry` = health check + retry · `eject` = health check + retry + passive ejection (2 lagataar fail → 2 s ke liye bahar).
- Columns: safal % · fail · median / p99 (ek request ko kitna waqt laga) · kitni requests 200 ms se dheemi thi · kitni requests fault ke dauraan kharab instance tak pahunchi (yeh instance ki apni ginti hai, isliye `fail` se ±1 ka farak window ke kinare par ho sakta hai).

```
$ node tools/faults.js
💥 instance 2 par fault 3 s se 7 s tak · 100 req/s · 10 s · number fault ke 4 s mein shuru hui requests ke

fault   setup                                     safal      fail   median      p99   dheemi   kharab tak
crash   health check hi                           97.00%      12    14 ms    16 ms        0          12
crash   health check + retry                     100.00%       0    14 ms    16 ms        0          11
crash   health check + retry + passive ejection  100.00%       0    14 ms    16 ms        0           2
slow    health check hi                           66.50%     134    14 ms   503 ms      134         134
slow    health check + retry                     100.00%       0    14 ms   517 ms      133         133
slow    health check + retry + passive ejection  100.00%       0    14 ms   515 ms       36          36
zombie  health check hi                           66.75%     133    14 ms    15 ms        0         133
zombie  health check + retry                     100.00%       0    15 ms    28 ms        0         133
zombie  health check + retry + passive ejection  100.00%       0    14 ms    24 ms        0           4
```

**Teen run ka dayra:**

| Fault | Setup | Safal % | Fail | Median | p99 | 200 ms se dheemi | Kharab instance tak |
|---|---|---|---|---|---|---|---|
| crash | health check hi | 97.0% | 12 | 14 ms | 15–16 ms | 0 | 12 |
| crash | health check + retry | 100.0% | 0 | 14 ms | 16 ms | 0 | 11 |
| crash | health check + retry + passive ejection | 100.0% | 0 | 14 ms | 15–16 ms | 0 | 2 |
| slow | health check hi | 66.5–66.8% | 133–134 | 14 ms | 503 ms | 133–134 | 133–134 |
| slow | health check + retry | 100.0% | 0 | 14 ms | 515–517 ms | 133 | 133 |
| slow | health check + retry + passive ejection | 100.0% | 0 | 14 ms | 515–516 ms | 36 | 36 |
| zombie | health check hi | 66.8% | 133 | 14 ms | 15–16 ms | 0 | 133 |
| zombie | health check + retry | 100.0% | 0 | 14–15 ms | 27–28 ms | 0 | 133 |
| zombie | health check + retry + passive ejection | 100.0% | 0 | 14 ms | 24–25 ms | 0 | 4 |

👉 **crash**: health check pakadta hai — sirf detection window ki requests fail (12). Retry ke saath 0. Kharab instance tak requests: 12 (health check ke bahar karne se pehle). Ejection ke saath 2 — ejection ne turant bahar kiya, phir health check ne bahar rakha. Health check band karke dekha (scratch copy mein `SETUPS` mein ek extra line: `{ instances: 3, health: false, retry: true, eject: EJECT_N }`): kharab tak 4 — ejection ke 2 s baad instance phir try hua, phir 2 fail, phir bahar.

👉 **slow aur zombie, sirf health check**: `/health` ✓ deta raha, isliye instance 2 kabhi bahar nahi gaya. Kharab tak 133 requests gayi, **har ek fail** → safal sirf 66.5–66.8% (slow) aur 66.8% (zombie) — lagbhag teen mein se do. Poori window bhar.

👉 **+ retry**: safal 100%. Par `slow` mein 133 requests ko 200 ms se zyada laga: p99 515–517 ms (median 14 ms). `zombie` mein p99 27–28 ms. Retry ne success bachaya; kharab instance tak requests ab bhi 133 jaa rahi hain.

👉 **+ passive ejection**: `zombie` mein kharab tak 4 (har ejection se pehle 2 fail, aur 2 s baad ek aur koshish). `slow` mein 36 — zyada kyun? Load balancer ko pehli failure ka pata **timeout (500 ms) ke baad** chalta hai, aur us beech lagbhag 17 requests (100 ÷ 3 × 0.5 s) kharab instance par pehle hi nikal chuki hoti hain. Har ejection-chakra mein yahi dohrata hai. p99 ab bhi 515–516 ms: itni dheemi requests 1% se zyada hain; par dheemi requests 133 se ghatkar 36 reh gayi.

👉 **Teen run itne paas-paas kyun?** Health check ka timer load balancer ke start se chalta hai (har 300 ms), fault ke waqt se nahi. Yeh harness har run mein fault ko lagbhag usi phase par lagata hai, isliye crash wali row har run mein lagbhag wahi aati hai. Detection window do fail health check ki hoti hai, isliye phase badalne se badalti hai: `FAULT_AT` 3.0 s / 3.1 s / 3.2 s karke (crash + sirf health check, har ek do baar chalaya) kharab tak 12 / 19 / 15 aaya. Asli number health check ke phase aur interval par nirbhar hai — isse zyada mat padho.

---

## ex3-experiment — prayog asli services par

`lib/experiment.js` ko asli services par chalaya. Peeche 100 req/s load chalta rehta hai. Naap = pichhle 500 ms mein poori hui requests ka safal % (monitoring jaisa). Hypothesis: fault ke dauraan kam se kam 95% safal. Abort rule: 80% se neeche → turant rollback. Har 500 ms par naap, 6 s tak. Fault: instance 2 **zombie**.
Har setup do baar: abort rule ke saath aur bina. Aakhri row: instance 3 **pehle se** zombie.
Columns: `steady` = shuru ka naap · `kharab` = fault ke dauraan sabse kharab naap · `fault chala` = inject se rollback tak asli seconds · `fail` = us dauraan shuru hui requests mein se fail (blast radius).

```
$ node tools/experiment.js
🔬 fault: zombie (instance 2) · 100 req/s · hypothesis ≥ 95% safal · abort rule < 80% · har 500 ms par naap, 6 s tak

setup                                         abort rule   faisla                        steady   kharab   fault chala   fail
health check hi                               laga hai     ABORT (0.5 s par)              100%      68%         0.5 s     17
health check hi                               nahi         hypothesis toota               100%      66%         6.0 s    200
health check + retry                          laga hai     hypothesis tika                100%     100%         6.0 s      0
health check + retry                          nahi         hypothesis tika                100%     100%         6.0 s      0
health check + retry + passive ejection       laga hai     hypothesis tika                100%     100%         6.0 s      0
health check + retry + passive ejection       nahi         hypothesis tika                100%     100%         6.0 s      0
health check hi · instance 3 pehle se zombie  laga hai     shuru hi mat karo               68%        —         0.0 s      0
```

**Teen run ka dayra:**

| Setup | Abort rule | Faisla | Fault asli mein kitni der chala | Fail (blast radius) |
|---|---|---|---|---|
| health check hi | laga hai | **ABORT** (0.5 s par) | 0.5 s | 17 |
| health check hi | nahi | **hypothesis toota** | 6.0 s | 200 |
| health check + retry | laga hai | **hypothesis tika** | 6.0 s | 0 |
| health check + retry | nahi | **hypothesis tika** | 6.0 s | 0 |
| health check + retry + passive ejection | laga hai | **hypothesis tika** | 6.0 s | 0 |
| health check + retry + passive ejection | nahi | **hypothesis tika** | 6.0 s | 0 |
| health check hi · instance 3 pehle se zombie | laga hai | **shuru hi mat karo** | 0.0 s | 0 |

👉 **Abort rule**: sirf health check wale setup mein fault 0.5 s mein ruk gaya, 17 requests fail. Bina abort rule ke fault poore 6.0 s chala, 200 fail — lagbhag 12 guna nuksan. Hypothesis dono mein toot-ti hai; abort rule ne sirf **blast radius** chhota rakha.

👉 **Retry / retry + ejection**: hypothesis tikti hai, 0 fail. Hypothesis ek hi metric (success %) ke baare mein thi — latency ki kahani ex2 mein alag dikhi.

👉 **Pehle se kharab**: steady state 68% aaya → faisla `shuru hi mat karo`, fault 0.0 s, 0 fail. Prayog ne shuru karne se pehle hi ek chhupi hui kharabi pakad li.

### Wahi prayog, fault: slow

```
$ node tools/experiment.js --fault slow
🔬 fault: slow (instance 2) · 100 req/s · hypothesis ≥ 95% safal · abort rule < 80% · har 500 ms par naap, 6 s tak

setup                                         abort rule   faisla                        steady   kharab   fault chala   fail
health check hi                               laga hai     ABORT (1.0 s par)              100%      67%         1.0 s     34
health check hi                               nahi         hypothesis toota               100%      66%         6.0 s    200
health check + retry                          laga hai     hypothesis tika                100%     100%         6.0 s      0
health check + retry                          nahi         hypothesis tika                100%     100%         6.0 s      0
health check + retry + passive ejection       laga hai     hypothesis tika                100%     100%         6.0 s      0
health check + retry + passive ejection       nahi         hypothesis tika                100%     100%         6.0 s      0
health check hi · instance 3 pehle se zombie  laga hai     shuru hi mat karo               68%        —         0.0 s      0
```

👉 **Der se pakda**: sirf health check wale setup mein abort rule 1.0 s par lagi, 34 fail (teeno run mein) — zombie fault mein 0.5 s par lagi thi, 17 fail. Wajah naap mein hai: naap "pichhle 500 ms mein **poori hui** requests" ka hota hai, aur slow instance par gayi request 500 ms ke timeout ke baad hi poori (fail) hoti hai. Isliye pehle naap mein woh requests thi hi nahi.

👉 **Hypothesis tiki, par…**: health check + retry mein faisla `hypothesis tika`, 0 fail. Isi setup aur isi fault ke liye ex2 ki table kehti hai: 133 requests 200 ms se dheemi, p99 515–517 ms. Naap sirf success % tha, isliye prayog ne latency ki kharabi dekhi hi nahi. Hypothesis mein woh har cheez likho jo user mehsoos karta hai — success % ke saath latency bhi.

---

## Asli tools mein (documentation se — is lab mein chalaye nahi gaye)

Yeh sab official pages se hai (har ek ka link saath mein hai; English quotes akshar-akshar). Kuch bhi yahan chalaya nahi gaya.

**Principles of Chaos Engineering** — <https://principlesofchaos.org/>

> "Chaos Engineering is the discipline of experimenting on a system in order to build confidence in the system’s capability to withstand turbulent conditions in production."

Page ke hisaab se prayog ke **chaar kadam** hain; saath mein lab mein woh kahan hai:

| Page ka kadam | Lab mein |
|---|---|
| Start by defining ‘steady state’ as some measurable output of a system that indicates normal behavior. | `measure()` — success % |
| Hypothesize that this steady state will continue in both the control group and the experimental group. | `hypothesis(m)` |
| Introduce variables that reflect real world events like servers that crash, hard drives that malfunction, network connections that are severed, etc. | `inject()` — `kill`, `slow`, `zombie` |
| Try to disprove the hypothesis by looking for a difference in steady state between the control group and the experimental group. | `worst` vs `hypothesis` — lab mein alag control group nahi hai; pehle ka naap (steady) hi tulna ka aadhaar hai |

"Advanced principles" ke paanch naam: *Build a Hypothesis around Steady State Behavior · Vary Real-world Events · Run Experiments in Production · Automate Experiments to Run Continuously · Minimize Blast Radius.*
Blast radius ke baare mein page: "it is the responsibility and obligation of the Chaos Engineer to ensure the fallout from experiments are minimized and contained."

**Netflix Chaos Monkey** — <https://github.com/Netflix/chaosmonkey> · <https://netflix.github.io/chaosmonkey/>
- Kya karta hai: "Chaos Monkey randomly terminates virtual machine instances and containers that run inside of your production environment."
- Kya chahiye: "You must be managing your apps with Spinnaker to use Chaos Monkey to terminate instances."
- Kab: "Every weekday, for each instance group, Chaos Monkey flips a weighted coin to decide whether to terminate an instance from that group. If the coin comes up heads, Chaos Monkey schedules a termination at a random time between 9AM and 3PM that day."
- Default: mean time between terminations "two (2) days"; minimum "one (1) day" ("guaranteed to never kill more often than once a day for each group").
- Opt-out: "You can opt-out combinations of account, region, stack, and detail."
- Lab ka `lib/monkey.js` isse bahut chhota hai: na weekday, na coin, na opt-out — bas "har N ms par ek random target".

**AWS Fault Injection Service — stop condition** — <https://docs.aws.amazon.com/fis/latest/userguide/stop-conditions.html>
> "A stop condition is a mechanism to stop an experiment if it reaches a threshold that you define as an Amazon CloudWatch alarm. If a stop condition is triggered during an experiment, AWS FIS stops the experiment."

Lab mein `abortIf` yahi kaam karta hai (alarm ki jagah ek function). Page kehta hai stop condition banane se pehle "define the steady state" — lab mein bhi pehle `measure()`.

**Chaos Mesh — PodChaos** — <https://chaos-mesh.org/docs/simulate-pod-chaos-on-kubernetes/> (docs version 2.8.4)
"Currently, PodChaos supports the following fault types": `pod-failure` (Pod kuch der ke liye unavailable), `pod-kill` (Pod ko maarta hai; restart ke liye ReplicaSet ya aisa kuch chahiye), `container-kill`. Sabse chhota YAML (page ka `pod-kill` example, akshar-akshar):

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-kill-example
  namespace: chaos-mesh
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces:
      - tidb-cluster-demo
    labelSelectors:
      'app.kubernetes.io/component': 'tikv'
```

**Envoy outlier detection** — <https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier>
- Kya hai: "Outlier detection and ejection is the process of dynamically determining whether some number of hosts in an upstream cluster are performing unlike the others and removing them from the healthy load balancing set." Aur: "Outlier detection is a form of passive health checking."
- Defaults (API reference, <https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/outlier_detection.proto>): `consecutive_5xx` **5** · `interval` **10 s** · `base_ejection_time` **30 s** · `max_ejection_percent` **10%**.
- Bahar rehne ka waqt: `base_ejection_time` × "the number of times the host has been ejected in a row" — lagataar kharab ho toh aur lamba.
- ⚠️ Zombie se judi baat: "If your active health check is not validating data plane traffic then in situations where active health checking passes but the traffic is failing, the endpoint will be unejected prematurely." Default mein pass hua active health check ejected host ko wapas le aata hai (`successful_active_health_check_uneject_host`, default true).

**Lab ka `eject` Envoy jaisa poora nahi:**

| | Lab (`lib/rotation.js`) | Envoy (docs ke defaults) |
|---|---|---|
| Kitne lagataar fail par bahar | 2 | 5 |
| Bahar rehne ka waqt | 2 s tay | 30 s × kitni baar eject hua |
| Ek saath kitne bahar ho sakte | koi had nahi (sab bahar ho jaayein toh sab mein se kisi ko try) | `max_ejection_percent` 10% |
| Active health check pass ho toh | ejection khatam **nahi** hota | default mein ejection khatam |

---

## ⚠️ Aam galatfehmi

- **"3 copies hain toh hum safe hain."** Copies kaafi nahi; load balancer ko pata hona chahiye kaun kharab hai. `ex1-monkey`: 3 instances bina health check → 87.4% safal, 201 fail. `ex2-faults`: zombie + health check → 66.8% safal.
- **"Health check hai toh har bimaar instance pakda jaayega."** Health check "kya tum zinda ho?" poochhta hai, "kya tum sahi kaam kar rahe ho?" nahi. `ex2-faults`: slow aur zombie mein instance kabhi bahar nahi gaya — 133–134 fail (slow), 133 fail (zombie). Slow motion 2 mein bhi: `/health` ✓ ✓ ✓, requests ✗.
- **"Retry laga diya, ab sab theek."** Retry success bachata hai, kharabi nahi hataata. `ex2-faults`: slow + retry → 100% safal, par 133 requests ko 200 ms se zyada laga (p99 515–517 ms) aur kharab instance tak 133 requests ab bhi gayi. Slow motion 3 `holds`: "hypothesis tika", phir bhi 7 requests ko retry lagi.
- **"Passive ejection laga diya, ab sab theek."** Pehli failure ka pata der se lagta hai, aur theek hone ke baad bhi instance kuch der bahar rehta hai. `ex2-faults`: slow + ejection → kharab tak 36 requests. Slow motion 2 `eject`: instance 3.00 s par theek, 4.15 s tak bahar.
- **"Chaos engineering = production mein kuch bhi tod do."** Prayog ka dhancha hai: steady state → hypothesis → ek fault → dekho → roko → wapas. `ex3-experiment`: abort rule ke saath 17 fail, bina uske 200. Steady state hi kharab ho toh prayog shuru hi nahi hota (shuru hi mat karo). Principles page bhi yahi kehta hai: "Minimize Blast Radius".
- **"Hypothesis tiki, matlab system poora theek hai."** Hypothesis ek metric ke baare mein hoti hai. `ex3-experiment` mein metric success % thi — `ex2-faults` ke latency ke kharche (p99 515–517 ms) us metric mein dikhte hi nahi.

## Khud try karo

1. `tools/slowmo.js` mein `HC_EVERY` 300 se 900 karo. `--mode health` mein detection window kitni lambi hui? Kitni requests mare hue instance par gayi? Instance 2 kab bahar gaya, kab wapas aaya?
2. `tools/slowmo-experiment.js` mein `ABORT_BELOW` 70 se 50 karo. `--mode abort` mein ab kya hota hai — aur kyun? (Har naap ko dhyaan se dekho.)
3. `tools/slowmo-faults.js` mein `EJECT_N` 2 se 3 karo. `--mode eject` mein instance 2 kab bahar gaya aur kitni requests kharab instance tak gayi? Phir `--mode eject --fault zombie` chalao. Uske baad `tools/faults.js` mein bhi `EJECT_N` 5 karo (Envoy ka default `consecutive_5xx`) aur `node tools/faults.js --fault slow --setup eject` chalao.
4. `tools/mini.js` mein `function experiment(retry) {` ke andar sabse pehli line `instances[1].dead = true;` likho (instance 2 pehle se mara hua). Dono rows kaise badli? "retry hai" wali row ka steady state kya aaya — aur kyun? Phir us row ka faisla ABORT kyun hua?
5. `tools/faults.js` mein `FAULT_AT` 3000 se 3100, phir 3200 karo, aur `node tools/faults.js --fault crash --setup hc` chalao (pehle `npm start ex2-faults`). Kharab tak kitni requests gayi, aur kyun badli?
