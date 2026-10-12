# 🐳 Lab 23 — Datadog: 40,000 servers, ek hi minute mein

System Gurukul → 📡 The Feed → **Datadog (8 March 2023)** levels ka lab. Zero dependency Node (18+).

```bash
npm start ex1-rules                              # kernel (4991) + cilium (4992) + networkd (4993)
node tools/incident.js --case reboot-test        # CI ka test: reboot karke dekho
node tools/incident.js --case in-place           # asli prod machine
PROTO=cilium npm start ex1-rules                 # fix 1: cilium apne rules par apna naam likhta hai
MANAGE_FOREIGN=0 npm start ex1-rules             # fix 2: networkd dusron ke rules ko chhoota nahi
node tools/fleet.js                              # ex2 — 200 nodes: same clock vs staged waves
npm start ex3-recovery                           # control plane (4994)
node tools/recover.js --nodes 5000               # ex3 — thundering herd vs backoff vs waves
docker compose --profile ex1-rules up --build    # profiles: ex1-rules, ex3-recovery
```

## ex1-rules — jiska koi maalik nahi, use koi bhi mita sakta hai

`kernel` service ke paas `ip rule` list hai: `{selector, table, proto}`. Pod ka packet `fwmark 0x200` ke saath aata hai;
match karne wala rule na mile toh packet `main` table mein jaata hai — jahan pod ka raasta hai hi nahi → **node dark**.

```
$ node tools/incident.js --case reboot-test
CASE reboot-test — machine abhi reboot hui (CI ka test machine)
  boot: systemd-networkd pehle chala (us waqt cilium ke rules the hi nahi)
  boot: phir cilium agent chala, apne rules daale
  ip rule: from 10.0.0.0/8 → main [static]  |  fwmark 0x200 → cilium [koi proto tag nahi]
  pod packets: 100 / 100 pahunche
✅ Test pass — reboot ke baad sab chalta hai. Isi liye ye bug 27 mahine chhupa raha.

$ node tools/incident.js --case in-place
CASE in-place — machine hafton se chal rahi hai, cilium ke rules pehle se lage hue hain
  ip rule: fwmark 0x200 → cilium [koi proto tag nahi]
  pod packets: 100 / 100 pahunche

06:00 UTC — systemd patch → networkd reapply → 1 rule(s) saaf: fwmark 0x200 [koi tag nahi] jo cilium ne banaya tha
  ip rule: from 10.0.0.0/8 → main [static]
  pod packets: 0 / 100 pahunche  💀 node dark — control plane se bhi katt gaya
```

**Poora farq sirf ORDER ka hai.** Boot par networkd pehle chalta hai (cilium ke rules hote hi nahi, mitane ko kuch nahi).
Prod machine hafton se chal rahi hai → rules pehle se lage hain → patch ne networkd se reapply karwaya → **foreign rules saaf**.
CI ne hamesha reboot wala case test kiya. Woh test 27 mahine tak pass hota raha.

### Dono fix

```
PROTO=cilium       → ip rule: fwmark 0x200 → cilium [cilium]        → reapply ne 0 rules saaf kiye → 100/100 ✅
MANAGE_FOREIGN=0   → reapply ne 0 rules saaf kiye                   → 100/100 ✅
```

`MANAGE_FOREIGN=0` = setting (shallow fix — default on hi rehta hai). `PROTO=cilium` = har rule par apne program ka naam
(protocol tag), jise networkd pehchan kar chhod deta hai — **ownership ek convention ban gayi**. Deep fix (bana nahi):
saajha resource ka ek maalik ya ek arbitration layer.

## ex2 — 200 machines, 5 regions, 3 clouds… aur ek hi ghadi

```
$ node tools/fleet.js
=== same-clock ===
  06:00 — saari 200 machines ne ek hi minute mein patch liya (same cron, same UTC ghadi)
  06:00 — 200 nodes dark. Monitoring bhi inhi nodes par thi → alert kisi ko nahi mila
  06:40 — customer ne bataya. Tab tak rokne ko kuch bacha hi nahi tha
  NATEEJA: 200/200 nodes dark (100% fleet), rokne mein 40 min

=== staged-fresh-canary ===
  06:05 — canary sab green ✅ ("test pass") → wave 2: baaki 196 machines
  NATEEJA: 196/200 nodes dark (98% fleet), rokne mein 40 min

=== staged-aged-canary ===
  06:02 — 4/4 canary dark → 06:05 rollout HALT. Baaki 196 machines bach gayi
  NATEEJA: 4/200 nodes dark (2% fleet), rokne mein 5 min
```

Staged rollout **tabhi** kaam karta hai jab canary us haalat mein ho jisme prod hai (purani machine, in-place patch).
Fresh canary ne bug pakda hi nahi — 98% fleet phir bhi gayi. Aur "5 regions, 3 clouds" ne kuch nahi bachaya:
upar ek hi package mirror, ek hi auto-update job, ek hi UTC clock. **Multi-region ≠ multi-fault-domain.**

## ex3-recovery — fix ho gaya, ab sab ek saath wapas aa rahe hain

Control plane: 60 registrations ek saath (~1,200/sec). Har koshish — 503 wali bhi — 0.5 ms CPU khaati hai.

```
$ node tools/recover.js --nodes 5000
herd      sab 5000/5000 nodes wapas aaye 30.2 s mein  |  attempts 40548 (bekaar ki koshishein 35548), p50 18.9 s, line peak 300
backoff   sab 5000/5000 nodes wapas aaye  6.6 s mein  |  attempts  7803 (bekaar ki koshishein  2803), p50  3.0 s, line peak 300
staged    sab 5000/5000 nodes wapas aaye  7.5 s mein  |  attempts  5000 (bekaar ki koshishein     0), p50  3.8 s, line peak 140
```

Utne hi nodes, utna hi asli kaam — par **turant retry** ne 35,548 bekaar koshishein banayi, jinhone control plane ka CPU khaaya →
recovery 30 s. Backoff + jitter: **6.6 s**. Waves: 0 bekaar koshish.
(Aur yaad rakho: is poore waqt monitoring inhi nodes par chal rahi thi — recovery kabhi us cheez par mat banao jo khud gir sakti hai.)

## Kya seekha

| Sawaal | Jawab lab se |
|---|---|
| Test pass, prod dark — kaise? | Boot order vs in-place: 100/100 vs 0/100 packets |
| Saajha kernel state ka maalik? | Koi nahi. Fix = protocol tag (ownership convention) |
| Multi-region kaafi hai? | Nahi — same mirror + same UTC cron = 200/200 dark |
| Canary green tha phir bhi? | Canary prod jaisi honi chahiye — fresh canary: 196 dark, aged canary: 4 |
| Sab ek saath wapas | Backoff/jitter/waves: 30 s → 6.6 s |
