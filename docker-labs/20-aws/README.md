# 🐳 Lab 20 — AWS: jab machines crore mein hon, har chhoti aadat ka hisaab

System Gurukul → 🤖 AI Companies → **Amazon ka $200B** levels ka lab (+ ⚡ Resilience → Blast Radius & Cells). Zero dependency Node (18+).

```bash
npm start ex1-constant-work      # checks (4921) + 3 DNS servers (4922–4924)
node tools/storm.js --sync delta        # har badlaav ek message, 1% raaste mein kho jaate hain
node tools/storm.js --sync constant     # har sec poori fixed-size file
npm start ex2-shuffle-shard      # fleet (4931, 8 asli worker processes 4940–4947) + router (4932)
node tools/poison.js                     # none / shard / shuffle
node tools/srd.js                        # ex3 — TCP vs SRD (koi server nahi)
npm start ex4-tiny-dbs           # metadata DB (4951) — shared vs cells
node tools/remirror.js
docker compose --profile ex1-constant-work up --build   # ya Docker se (profiles: ex1-constant-work, ex2-shuffle-shard, ex4-tiny-dbs)
```

## ex1-constant-work — Route 53 health checks: barista vs coffee machine

10,000 health checks. Aam din: har sec 10 badalte hain. t=4: **10,000 ek saath** (bura din).

```
$ node tools/storm.js --sync delta
sync=delta drop=0.01
 sec  badlaav   kaam/DNS server (msgs, KB)   drift (DNS copy ≠ sach, max of 3)
   3       10         10 msgs      0 KB           1
   4    10020       9772 msgs    180 KB         290   ← storm
   5       10        156 msgs      3 KB         108
   6       10          9 msgs      0 KB         108
  14       10         10 msgs      0 KB         109
peak kaam: 9772 msgs/sec, 180 KB/sec per DNS server

$ node tools/storm.js --sync constant
   3       10          1 msgs     10 KB           0
   4    10010          1 msgs     10 KB           0   ← storm
   5       10          1 msgs     10 KB           0
  14       10          1 msgs     10 KB           0
peak kaam: 1 msgs/sec, 10 KB/sec per DNS server
```

- **delta**: aam din 10 msgs/sec, bure din **9,772 msgs/sec** (~1000×) — sabse zyada kaam thik tab jab system pehle se pareshan hai.
  1% messages khoye → **~108 checks hamesha ke liye galat** (drift). Koi dobara nahi bhejta; agla badlaav aane tak galat.
- **constant**: har sec ek hi kaam — 10 KB poori file. 10 badlaav ho ya 10,000, **same**. Kuch chhoot bhi gaya toh agli file
  sab overwrite kar deti hai → drift **0**. Jaan-boojh ke "wasteful" — par sabse bura din = sabse shaant din.

## ex2-shuffle-shard — ek zeher wali request, 8 workers

Customer 7 ki request kisi parser bug ko chhedti hai → jo worker use chhuye, **process crash** (`process.exit`). Router fail
hone par customer ke **agle** worker par retry karta hai → retry hi zeher ko aage le jaata hai.

```
$ node tools/poison.js
sharding   poison ne kitne workers maare   customers POORE band   customers jo mare worker share karte the par bach gaye
none         8 / 8  (saare 8)                  99 / 99            0
shard        2 / 8  (4946,4947)                24 / 99            0
shuffle      2 / 8  (4942,4947)                 3 / 99            43

Combinations: C(8,2) = 28 → kisi aur customer ka EXACT same jodi hone ka chance 1/28 (< 4%).
Route 53 jaisa: 100 workers, har customer ko 5 → C(100,5) = 75,287,520 combinations.
Hardware 8 → 100 (12.5x), combinations 28 → 2,688,840x.
```

- **none**: retry ne saare 8 maar diye → **sab band**.
- **shard** (4 × 2): customer 7 ka shard gaya → us shard ke **24** customers poore band (≈ 1/4).
- **shuffle** (har customer ka apna 2-of-8 jodi): sirf **3** ka exact same jodi tha → band. **43** customers ka ek worker mara,
  par dusra zinda → retry ne bacha liya. Same hardware, sirf **assignment** badla.

## ex3 — TCP vs SRD (data center ke andar)

```
$ node tools/srd.js
1 flow = 1 MB, 1000 flows, 64 raaste, raasta #0 kharab.  TCP RTO 1.00 ms, SRD retransmit 20 µs
kharabi             protocol    p50        p99        max        flows jo 1 ms se zyada ruke
sab theek           TCP         89 µs      89 µs      89 µs      0
sab theek           SRD         89 µs      89 µs      89 µs      0
1 raasta 1% loss    TCP         89 µs      1.09 ms    3.09 ms    14
1 raasta 1% loss    SRD         89 µs      110 µs     110 µs     0
1 raasta dead 20ms  TCP         89 µs      31.09 ms   31.09 ms   10
1 raasta dead 20ms  SRD         110 µs     110 µs     110 µs     0
```

Model (assumptions, `tools/srd.js` ke upar likhe): 100 Gbps NIC, 5 µs latency, TCP ka RTO 1 ms (DC-tuned; Linux default min
200 ms → `--rto-ms 200` chalao: p99 **200 ms**). TCP ka flow ek raaste par hash hota hai (ECMP) → 1/64 flows kharab raaste par →
unlucky flows **ms** tak ruke, aur order ki wajah se peeche ke packets bhi (head-of-line). SRD har flow ko 64 raaston par bikherta
hai → kharab raaste par sirf 2 packets → 20 µs baad dusre raaste se. **p50 same, tail 280× behtar.**

## ex4-tiny-dbs — EBS 2011: ek bada DB vs chhote chhote cells

1,500 volumes, 3 AZ. Normal: har volume har 2 sec ek metadata query (DB ~62% busy). t=3: AZ-A mein network change →
**300 volumes** re-mirror dhoondhte hain, AZ-A mein sirf 30 nayi jagah/sec → baaki "jagah nahi" → 20 ms baad phir.
Dono modes mein kul DB capacity **same** (12 slots × 10 ms).

```
$ node tools/remirror.js
mode=shared   (normal queries safal % per AZ, har second)
 sec   AZ-A   AZ-B   AZ-C   re-mirror poore
   3   100%   100%   100%     0
   4    22%    26%    21%    40   ← storm (t=3)
   6    26%    27%    30%    28
   9    50%    51%    45%    34
  12    99%    99%   100%    35
storm ke dauraan (sec 4–13): AZ-A 56%, AZ-B 58%, AZ-C 55%  |  re-mirror 300/300 poore, aakhri 9.1 s mein

mode=cells   (normal queries safal % per AZ, har second)
   4    22%   100%   100%    60   ← storm (t=3)
   6    10%   100%   100%    30
   9    14%   100%   100%    30
  12    88%   100%   100%    30
storm ke dauraan (sec 4–13): AZ-A 32%, AZ-B 100%, AZ-C 100%  |  re-mirror 300/300 poore, aakhri 8.5 s mein
```

- **shared**: dikkat sirf AZ-A mein thi, par AZ-B aur AZ-C ki normal queries bhi **~58%** — ek bada DB = sabka saajha dukh.
  (2011 mein yahi hua: re-mirror storm ne region ka control-plane DB gira diya, dusre AZ ke API calls bhi fail.)
- **cells**: AZ-B, AZ-C **100%** — unhe pata hi nahi chala. AZ-A ko zyada dard (32%) kyunki use sirf apne 4 slots mile —
  yahi trade-off hai: **blast radius ek jaana-pehchaana number**, poora region nahi. Physalia aur aage jaata hai: har volume
  ka apna 7-node Paxos cell, volume ke paas.

## Kya seekha

| Sawaal | Jawab lab se |
|---|---|
| Config/health data lakhon servers tak | Constant work: bure din bhi same kaam, drift 108 → 0 |
| Ek kharab customer sabko gira de | Shuffle sharding: 99 → 24 → **3** customers band, same hardware |
| DC mein TCP ki tail latency | SRD: 64 raaste, no order, µs retransmit → p99 31 ms → 110 µs |
| Ek bada shared DB | Chhote cells: dusre AZ 58% → 100% |
