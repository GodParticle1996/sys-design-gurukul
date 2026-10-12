# 🐳 Lab 18 — BitTorrent: 40 log, ek file, aur origin ko aaram

System Gurukul → 🌍 Planet-scale Infra → **BitTorrent** levels ka lab. Zero dependency Node (18+).

```bash
npm start ex1-flash-crowd                  # tracker (4881) + swarm (4882: 1 origin + N peers, har peer ka apna port 5000+)
node tools/flash.js --mode origin          # sab sirf origin se download
node tools/flash.js --mode swarm           # tracker se peers ki list, phir peers ek dusre se
node tools/flash.js --mode swarm --malicious 5
node tools/rarest.js                       # ex2 — koi server nahi chahiye
node tools/titfortat.js                    # ex3
node tools/dht.js                          # ex4
docker compose --profile ex1-flash-crowd up --build     # ya Docker se
```

File = 32 pieces × 64 KB = 2 MB. Har piece ke **asli bytes** HTTP par jaate hain. `.torrent` = har piece ka SHA-1.
Receiver har piece ka hash **khud** nikaalta hai — match nahi hua toh piece phenko aur bhejne wale ko ban.
Upload speed limit: origin 20 pieces/sec, aam peer 4 pieces/sec (token bucket → 503 "abhi busy").

## ex1-flash-crowd — origin akela vs swarm

```
$ node tools/flash.js --mode origin
mode=origin  peers=40  malicious=0  file=2 MB (32 pieces)
  t= 44s  finished  0/40   origin ne bheje 901  peers ne bheje 0
  t= 64s  finished 40/40   origin ne bheje 1280  peers ne bheje 0
RESULT origin: 40/40 done, last at 63.0 s, p50 57.9 s
  origin ka upload: 1280 pieces (100% of total)

$ node tools/flash.js --mode swarm
RESULT swarm: 40/40 done, last at 6.8 s, p50 6.2 s
  origin ka upload: 151 pieces (12% of total)

$ node tools/flash.js --mode swarm --peers 80
RESULT swarm: 80/80 done, last at 7.5 s, p50 6.7 s
  origin ka upload: 162 pieces (6% of total)
```

Origin mode: 40 × 32 = 1280 pieces ÷ 20/sec = **64 sec**, aur 44 sec tak ek bhi banda poora nahi. Swarm: **6.8 sec**,
origin ne sirf 151 pieces bheje (har piece ~5 baar), baaki 88% peers ne ek dusre ko diya.
Log dugne (80) kiye → time lagbhag wahi (7.5 s), origin ka hissa 12% → 6%. **Jitne zyada log, utni zyada upload capacity.**

### Jhoothe peers (poisoning)

```
$ node tools/flash.js --mode swarm --malicious 5
  t=  2s  finished  0/35   origin ne bheje 56  peers ne bheje 296  corrupt pakde 55
  t=  8s  finished 35/35   origin ne bheje 152  peers ne bheje 968  corrupt pakde 143
RESULT swarm: 35/35 done, last at 6.9 s, p50 6.5 s
  SHA-1 mismatch: 143 pieces reject, 143 bans — koi kharab piece file mein nahi gaya
```

5 peers tracker ko bolte hain "mere paas poori file hai" aur har piece ka ek byte badal dete hain. Har honest peer ne
unse ek-ek baar dhokha khaaya (143 ≈ 35 × 5 ke paas), hash ne pakda, ban kiya. Time 6.8 → 6.9 sec — **hash check sasta hai,
bharosa mehenga.**

## ex2 — rarest-first: seeder jaldi chala gaya

Simulator (`lib/swarm.js`, 1 tick = 1 sec, pieces ke asli SHA-1 check ke saath): 200 peers, 128 pieces, origin 8 pieces/sec →
origin ko har piece **ek baar** bhejne mein 16 sec lagte hain.

```
$ node tools/rarest.js
policy       seeder gaya   pieces jo swarm se GAAYAB   peers jo poore hue   last done
sequential   t=10           122 / 128                 0 / 200          —
sequential   t=16           118 / 128                 0 / 200          —
sequential   t=20           116 / 128                 0 / 200          —
sequential   t=30           110 / 128                 0 / 200          —
rarest       t=10            53 / 128                 0 / 200          —
rarest       t=16             5 / 128                 0 / 200          —
rarest       t=20             0 / 128               200 / 200          t=71
rarest       t=30             0 / 128               200 / 200          t=70
```

Sequential mein sab piece 0, 1, 2… maangte hain → origin wahi shuruaati pieces baar baar bhejta hai → t=30 par bhi 110 pieces
kisi ke paas nahi → **koi bhi poora nahi**. Rarest-first mein origin t=20 tak har piece ki kam se kam ek copy swarm mein daal
deta hai → origin chala jaaye tab bhi **200/200 poore**. (t=16 par 5 gaayab: pehla piece random hota hai, thodi duplicate.)

## ex3 — tit-for-tat vs free-riders

```
$ node tools/titfortat.js
choke        honest peers p50   free-riders p50   (sec, 200 peers, 128 pieces, 20% free-riders)
none               78                 71
titfortat          67                 87

titfortat BINA optimistic unchoke (koi free-rider nahi): 400 sec mein 0/200 poore hue, p50 —
```

`none`: free-rider (0 upload) honest logon se bhi **pehle** khatam (71 vs 78) — dene walon ko saza. `titfortat`: har uploader
apne 3 slots unhe deta hai jinse use sabse zyada mila, +1 **optimistic** slot random ko (har 3 sec badalta hai).
Honest 78 → **67 sec**, free-rider 71 → **87 sec**. Free-rider ko sirf optimistic slots ke tukde milte hain.
Optimistic slot hata do → naye peer ke paas dene ko kuch nahi, koi unchoke nahi karta → sirf origin deta hai →
**400 sec mein 0/200**. Optimistic unchoke hi naye logon ka darwaza hai.

## ex4 — Kademlia DHT: tracker ke bina peers dhoondho

```
$ node tools/dht.js
nodes       har node kitne jaanta hai   avg rounds   max rounds   avg messages   sahi node mila   (300 lookups, k=8, alpha=3)
1000            63 (6.30%)            4.0            5           11.0         100.0%
10000           89 (0.89%)            4.6            6           12.8         100.0%
100000         116 (0.12%)            5.3            7           14.8         100.0%
```

Har node ki ID random; "distance" = `idA XOR idB`. Har node har distance-range (bucket) mein bas k=8 nodes jaanta hai →
1 lakh nodes mein se sirf **116** (0.12%). Lookup: "tumhe target ke jo 8 sabse paas pata hain, batao" — 3 ko ek saath
poochho (alpha), jo naye paas wale mile unse poochho. Nodes **100×** badhe (1000 → 1 lakh), rounds sirf **4.0 → 5.3**, messages
11 → 15. Har jawab XOR distance ka kam se kam ek bit aur "sahi" kar deta hai → **log N**. (Asli ID 160-bit, yahan 32-bit.)

## Kya seekha

| Sawaal | Jawab lab se |
|---|---|
| Server ko 40 log maar rahe hain | Swarm: 63 s → 6.8 s, origin ka load 100% → 12% |
| Anjaan peer par bharosa? | Mat karo — `.torrent` ka SHA-1 har piece check karo, galat = ban |
| Seeder jaldi chala jaayega | Rarest-first: har piece ki ek copy jaldi bahar |
| Log sirf lete hain, dete nahi | Tit-for-tat + optimistic unchoke |
| Tracker hi band ho gaya | DHT: log N rounds mein sahi node |
