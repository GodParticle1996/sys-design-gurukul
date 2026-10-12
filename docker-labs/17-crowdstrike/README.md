# 🐳 Lab 17 — CrowdStrike: 21 maange, 20 mile, aur 500 machines

System Gurukul → 📡 The Feed → **CrowdStrike (July 2024)** levels ka lab. Zero dependency Node (18+).

```bash
npm start ex1-content-push                       # content cloud (4871) + 500-machine fleet (4872), MODE=kernel
node tools/incident.js --validator spec --rollout global
MODE=user npm start ex1-content-push             # security agent kernel ke bahar
docker compose --profile ex1-content-push up --build   # ya Docker se
```

`lib/sensor.js` = engine vs fuel:
- **Sensor code** (engine, slow lane, signed): har named-pipe event ke **20** inputs deta hai.
- **Template type** (contract): rule mein **21** fields honge.
- **Channel file 291** (fuel, fast lane): Feb wala sab jagah field 21 = `*` (wildcard) → interpreter input 21 kabhi padhta hi nahi.
  July wala: field 21 mein **pehli baar asli value** → `input[20]` padha → `PAGE_FAULT_IN_NONPAGED_AREA (csagent.sys)`.

Validator do tarah ka: `spec` (rule mein 21 fields? bas — July 2024 wala) aur `contract` (asli value wala field sensor ke 20 ke
andar hai?). Rollout do tarah ka: `global` (sabko turant) aur `rings` (1% canary → 10% → 50% → 100%, har gate par "pichhli ring
mein koi crash?" → ruko). Fix t=3s par publish hota hai (video mein 78 minute).

## ex1-content-push

```
validator=spec rollout=global  (MODE=kernel)
  t=1s  up=  0 bootloop=500 manual=  0 | kabhi crash hue: 500
  t=3s  → FIX publish kiya (revert)
  t=4s  up=214 bootloop=286 manual=  0
  t=5s  up=340 bootloop=160 manual=  0
  t=6s  up=408 bootloop=  0 manual= 92

validator=spec rollout=rings  (MODE=kernel)
  t=1s  up=495 bootloop=  5 manual=  0 | kabhi crash hue: 5 | rings open 1 (HALTED)
  t=3s  → FIX publish kiya (revert)
  t=6s  up=500 bootloop=  0 manual=  0

validator=contract rollout=global
publish c291 (jul-19) → 🛑 REJECTED: field 21 par asli value, par sensor sirf 20 inputs deta hai
  t=1s  up=500 bootloop=  0 manual=  0 | kabhi crash hue: 0

validator=spec rollout=global  (MODE=user)
  t=2s  up=500 bootloop=  0 manual=  0 | kabhi crash hue: 500 | agent restarts 4773
  t=8s  up=500 bootloop=  0 manual=  0 | kabhi crash hue: 500 | agent restarts 7163
```

👉 **Global push = poora fleet ek second mein.** Feb se July tak har test pass tha — kyunki har rule mein field 21 wildcard tha.
Test sirf un inputs ko check karta hai jo **likhe ja chuke** hain.

👉 **Boot loop:** machine reboot hoti hai, boot-start driver network se **pehle** disk wala zehreela content padhta hai, phir
crash. Fix cloud par hai par machine tak pahunch nahi paata. Har reboot par 10% chance ki network pehle aa jaaye → 15 reboots ke
baad bhi **92 machines (18%)** ko haath se theek karna pada (safe mode, file delete — asli mein BitLocker key bhi chahiye thi).

👉 **Rings + canary:** wahi bug, par sirf **5** canary machines giri, rollout apne aap **ruk** gaya. "Deployment radius = blast radius."

👉 **Contract-aware validator:** zehreela file publish hi nahi hua. Artifact nahi, **contract** check karo.

👉 **User mode** (Mac Endpoint Security / Linux eBPF jaisa): wahi bug, par sirf **agent process** mara aur restart hua (7,163
baar) — **ek bhi machine nahi giri**. Crash domain machine se chhota.

## Khud try karo

1. `services/cloud.js` mein canary ring ko 5 se 1 machine karo (`ringOf`). Health gate ab bhi pakadta hai? 0 machines ki ring ho toh?
2. `tools/incident.js --fix-after 1` — fix jaldi aaye toh manual machines kitni?
3. `lib/sensor.js` ke `evaluate` mein bounds check jodo (`f >= input.length` → `return false`). Kya validator ki zaroorat khatam?
   (Nahi — "prove it" wali soch: dono layers.)
