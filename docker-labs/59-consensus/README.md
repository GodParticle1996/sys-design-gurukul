# 🧪 Lab 59 — Consensus aur Raft: quorum, election, keemat, up-to-date niyam, reads

System Gurukul → 🧪 First Principles → Consensus & Raft (Kyun · Kaise · Code · Kab).
Node 24+, koi package install nahi. Captures Node v24.18.0 par, WSL2 machine par. Koi port nahi.

Lab 09 (🌐 Distributed → Consensus levels) asli 5 Raft processes chalata hai: leader maaro, same timeouts, quorum,
3 | 2 partition. Lab 59 un cheezon ko naapta hai jo lab 09 nahi naapta: quorum ka hisaab, hazaaron elections ki ginti, consensus ki
keemat, video ka chhoda hua "candidate up to date ho" niyam, aur Raft se padhna.

```bash
npm start -- ex0-quorum       # ASLI ginti + MODEL: majority overlap, odd vs even N, commit latency
npm start -- ex1-election     # MODEL (seeded): 10,000 elections × 5 timeout ranges — split votes aur intezaar
npm start -- ex2-price        # ASLI fsync samples + MODEL network: single node vs Raft (same AZ, regions), batching
npm start -- ex3-up-to-date   # MODEL (seeded): election restriction ke bina committed entry kho jaati hai
npm start -- ex4-reads        # MODEL: kata hua purana leader — local read, ReadIndex, lease, dheemi ghadi
npm test                      # 5 tests
docker compose --profile ex0-quorum up --build   # supplied, untested
```

**Is machine par Docker nahi; compose chalaya nahi gaya.**

## Lab ka daayra (kya asli, kya model)

- **ex0 A/B asli hisaab:** har subset gina gaya; availability binomial formula se (maan kar ki nodes alag-alag fail hote hain).
  ex0 C model: follower ack ki latency random (0.5 ms + ausat 0.3 ms, 2% baar 20 ms jhatka).
- **ex1 model:** 1–5 ms network, koi packet loss nahi, koi disk nahi. Asli processes par election: lab 09.
- **ex2:** fsync **asli** (is laptop ki disk, 128-byte entry, 400 baar); RTT model (same AZ 0.5 ms, regions 60 ms).
  Batch ka fsync ek entry jitna maana; leader ka CPU, pipelining aur bandwidth nahi gine.
- **ex3, ex4 model:** kaun kisse vote/jawab deta hai, niyam se; koi asli Raft nahi chalta.

## ex0-quorum — majority kyun, aur 4 nodes 3 se kyun bure

```
$ npm start -- ex0-quorum
A. Quorum = majority. Kya do quorums hamesha kam se kam ek voter share karte hain? (har subset gina)

N   majority   kitne down sah sakta   majority overlap   "aadha" (N/2) quorum overlap
3      2              1                 haan, hamesha        NAHI — do alag 1-1 gut, do leader
4      3              1                 haan, hamesha        NAHI — do alag 2-2 gut, do leader
5      3              2                 haan, hamesha        NAHI — do alag 2-2 gut, do leader
6      4              2                 haan, hamesha        NAHI — do alag 3-3 gut, do leader
7      4              3                 haan, hamesha        NAHI — do alag 3-3 gut, do leader

B. Har node alag-alag p waqt band ho (independent). Majority milne ka chance:

N    p = 1%      p = 5%      p = 10%
3   99.970%     99.275%     97.200%
4   99.941%     98.598%     94.770%
5   99.999%     99.884%     99.144%
6   99.998%     99.777%     98.415%
7  100.000%     99.981%     99.727%

→ 4 nodes, 3 se KAM chalte hain (3 ki jagah 3 of 4 chahiye: zyada nodes, zyada cheezein toot sakti hain). 6 bhi 5 se kam.

C. MODEL: commit kab? Leader + followers; har follower ka ack 0.5 ms + random (ausat 0.3 ms), 2% baar 20 ms ka
   jhatka (GC, queue). Leader khud ek vote; commit = majority ke liye zaroori ack aate hi. 1 lakh commits per N.

N   kitne follower acks chahiye   median     p99
3   1 of 2                         0.61 ms    1.26 ms
4   2 of 3                         0.71 ms    1.47 ms
5   2 of 4                         0.65 ms    1.12 ms
7   3 of 6                         0.67 ms    1.06 ms

→ Commit sabse dheeme follower ka nahi, zaroori ginti wale ack ka intezaar karta hai. 4 nodes sabse dheema (2 of 3).
  5 aur 7 ka p99 is model mein 3 se kam: zyada followers mein se tez wale mil jaate hain. Model leader ka zyada messages
  bhejne ka kaam, bandwidth aur disk nahi ginta — asli cluster mein bade N ki keemat alag se naapo.
```

- **Majority overlap:** kisi bhi do majorities mein kam se kam ek voter common — har subset gin kar dekha. Common voter ek term
  mein do candidates ko vote nahi deta, isliye ek term mein do leader nahi. "Aadha" quorum (N/2) par do alag gut ban sakte hain.
- **Odd vs even:** 4 nodes utni hi failure sahte hain jitne 3 (ek), par **chalne ka chance kam** hai: har node 5% band ho
  toh 3 nodes 99.275%, 4 nodes 98.598%. Zyada nodes = zyada cheezein toot sakti hain, aur 4 mein 3 chahiye. 6 bhi 5 se kam.
- **Commit latency (model):** commit zaroori ginti wale ack ka intezaar karta hai, sabse dheeme ka nahi. 4 nodes sabse
  dheema (3 mein se 2 acks). 5 aur 7 ka p99 is model mein 3 se kam — par model leader ka zyada messages bhejna, bandwidth aur disk
  nahi ginta.

## ex1-election — timeout ki range

```
$ npm start -- ex1-election
timeout range        split vote (≥1 baar)   naya leader: median     p99        sabse lamba
150–150 ms           100.0%                 kabhi nahi — 10,000 mein se ek bhi election 1,000 rounds mein nahi jeeta
150–155 ms            79.8%                   646 ms     3442 ms     7047 ms
150–200 ms             7.0%                   165 ms      380 ms      762 ms
150–300 ms             2.2%                   181 ms      462 ms      783 ms
150–1500 ms            0.2%                   370 ms     1092 ms     2013 ms

Sab ka bilkul same timeout (150–150): har round mein chaaron ek saath candidate, sab khud ko vote → hamesha split. Asli
processes mein bhi yahi hota hai: lab 09 ka SAME_TIMEOUT run 10 s mein koi leader nahi chun paaya (105 elections).
Range chaudi = kam split votes, par range ka upar wala hissa bhi intezaar badhaata hai (150–1500: p99 lamba).
Model: sirf 1–5 ms ka network, koi packet loss nahi, koi disk nahi. Lab 09 asli 5 processes par election dikhata hai.
```

- Bilkul same timeout: har round mein sab candidate, sab khud ko vote → model mein kabhi leader nahi. Lab 09 ke asli
  5 processes mein bhi `SAME_TIMEOUT` par 10 s mein koi leader nahi bana (105 elections); kabhi-kabhi sanyog se ban jaata hai.
- 150–155 ms (lagbhag same): 79.8% elections mein split vote, p99 3.4 s. 150–300 ms (Raft paper ka example): 2.2% split,
  median 181 ms. 150–1500 ms: split lagbhag nahi, par median 370 ms aur p99 1.1 s — range ka upar wala hissa bhi intezaar hai.

## ex2-price — consensus ki keemat

```
$ npm start -- ex2-price
Asli fsync, 400 baar (128-byte entry): median 1.10 ms, p99 1.96 ms

setup                         ek commit: median     p99       commits/sec (B = batch)
single node (sirf fsync)              1.10 ms     2.02 ms   B=1: 909  B=16: 14,536  B=128: 1,16,291
Raft 3 nodes, same AZ (RTT 0.5 ms)    1.57 ms     2.02 ms   B=1: 635  B=16: 10,159  B=128: 81,275
Raft 3 nodes, regions (RTT 60 ms)    61.07 ms    61.27 ms   B=1: 16  B=16: 262  B=128: 2,096

commits/sec = B ÷ ek round ka median (ek leader, ek ke baad ek round; pipelining aur CPU nahi gina).
Consensus ki keemat: har commit par fsync + kam se kam ek network round trip. Regions mein RTT hi sab kuch.
Batching ek fsync aur ek round trip ko kai entries mein baant'ti hai; Raft implementations (jaise etcd) bhi entries batch karte hain.
```

3 runs: asli fsync median 1.10–1.16 ms. Ek commit (median): single node 1.10–1.16 ms; Raft same AZ 1.57–1.61 ms; Raft
regions 61.07–61.11 ms. Batch 128 par: single node 1.11–1.16 lakh/sec, same AZ ~79,000–81,000/sec, regions ~2,095/sec.

- Raft commit = leader ka fsync **aur** (RTT + ek follower ka fsync) — dono saath chalte hain, dheema wala jeet'ta hai.
  Same AZ mein fsync hi bada hissa; regions mein round trip hi sab kuch.
- Batching ek fsync aur ek round trip ko kai entries mein baant'ti hai. Isliye Raft group par "user comments" jaisa bhaari
  traffic nahi, metadata (kaun leader, config) — jaisa video kehta hai. Zyada writes ke liye kai Raft groups (sharding).

## ex3-up-to-date — video ka chhoda hua niyam

```
$ npm start -- ex3-up-to-date
5 nodes. Entry X leader 1 + 2 followers par (majority) → committed, client ko "ho gaya". Leader 1 mara.
Nodes 2–5 mein se 2 ke paas X, 2 ke paas nahi. 10,000 baar, timers ka kram random.

vote ka niyam                                   committed X kho gaya     extra election rounds
koi bhi candidate, pehle aaye ko vote           5,007 (50.1%)           0
candidate ka log mere jitna naya ho (§5.4.1)        0 (0.0%)           6,702

Bina niyam: pehle timer wala node leader banta hai — aadhe baar bina X wala node. Naya leader followers se apna
log copy karwata hai → X mit jaata hai, jabki client ko "ho gaya" bola ja chuka tha.
Niyam ke saath: X wale nodes bina X wale candidate ko vote nahi dete; bina X wala 3 votes nahi jod sakta (khud + 1).
Kyunki X majority par hai, har jeetne layak majority mein kam se kam ek X wala voter hota hai. Keemat: kuch extra rounds.
```

- Video kehta hai "candidate up to date ho, us baare mein baad mein baat karenge" — aur baat kabhi nahi hoti. Up-to-date
  niyam (Raft §5.4.1) committed data bachata hai. Bina niyam ke ~50% baar naya leader bina X wala node bana, aur committed
  X mit gaya. Niyam ke saath 0; keemat: kuch extra election rounds.
- Ek aur baariki (lab mein nahi): naya leader purane term ki entries ko sirf replica gin kar commit nahi karta; apne term ki
  entry commit hone par purani bhi commit hoti hain (Raft §5.4.2, Figure 8).

## ex4-reads — Raft se padhna

```
$ npm start -- ex4-reads
padhne ka niyam                                  jawab diye   purana version   mana
local read (apni copy se)                         200          170             0
ReadIndex (pehle majority se pucho)                 0            0           200
lease 200 ms (election 300 ms se chhota)           20            0           180
lease, par purane leader ki ghadi 2× dheemi        40           10           160

local read: purana leader jaanta hi nahi ki naya leader aa gaya → 170 reads mein purana version (Raft log sahi hai, read galat).
ReadIndex: har read se pehle majority se heartbeat ka jawab chahiye → chhoti taraf mana karti hai; sehatmand leader par
  har read ki keemat ek round trip.
Lease: majority ka aakhri ack + 200 ms tak bina pooche padho; naya leader 300 ms se pehle nahi ban sakta → safe, BASHARTE
  ghadiyon ka farq seema mein ho. Ghadi 2× dheemi → lease 400 ms tak "valid" lagi → naye leader ke baad bhi purana jawab.
```

- Log sahi hone se read sahi nahi hota. Kata hua purana leader apni copy se padhe toh 170 reads purane (naya leader likh
  raha tha). **ReadIndex:** padhne se pehle majority se heartbeat — chhoti taraf mana karti hai, sehatmand leader par har
  read ki keemat ek round trip. **Lease:** election timeout se chhoti lease tak bina pooche padho — safe, jab tak ghadiyon ka
  farq seema mein ho; ghadi 2× dheemi toh 10 purane reads. Raft §8 ReadIndex aur lease, dono raaste batata hai.
- Raft se linearizable system ke liye client ko bhi dhyaan chahiye: timeout par retry ek hi command do baar na chalaye (request
  id se pehchaano — lab 09 ex2 ka "timeout = pata nahi").

## Source ke daave aur sudhaar

| Video kehta hai | Sach / sudhaar | Kahan se |
|---|---|---|
| "Crash-stop model" | Raft crash-**recovery** maanta hai: node restart hokar disk se term, vote aur log padhta hai. Byzantine (jhooth) nahi | Raft §5 |
| Candidate "up to date" ho — "baad mein batayenge" | Kabhi nahi bataya. Up-to-date niyam na ho toh committed entry kho sakti hai (ex3: ~50%) | Raft §5.4.1, ex3 |
| 4 nodes = 3 jitni safety, bas mehnga | Failures utni hi sahi, par chalne ka chance **kam** (5% failure par 98.6% vs 99.3%) | ex0 |
| Raft se CAP ka C | Log ka kram pakka; linearizable **reads** ke liye ReadIndex ya lease, aur client retry ki pehchaan bhi chahiye | Raft §8, ex4 |
| Timeout 150–300 ms | Raft paper ka example; asli systems network ke hisaab se rakhte hain (etcd default election timeout 1000 ms) | Raft §5.2, etcd docs |
| etcd consensus kho de toh poora Kubernetes freeze | Control plane naye badlaav nahi kar paata (API writes fail); chalte pods aam taur par chalte rehte hain | Kubernetes / etcd docs |
| Kafka 4.0 (2025) mein ZooKeeper poora hata, KRaft | Haan: Kafka 4.0 (March 2025) sirf KRaft mode | Apache Kafka 4.0 release notes |
| Consensus writes parallel nahi ho sakte | Ek group mein leader ek kram banata hai, par batching aur pipelining se throughput badhta hai (ex2: batch 128 par ~80,000/sec same AZ, model) | ex2 |
| Paxos ke lekhakon ko "Paxos Made Simple" likhna pada | Lamport ne 1998 ka paper aur 2001 mein "Paxos Made Simple" likha | Lamport 2001 |
| Raft 2013/2014, Stanford | Ongaro & Ousterhout, USENIX ATC 2014 | Raft paper |

## Sources

- Ongaro & Ousterhout, *In Search of an Understandable Consensus Algorithm* (2014) — https://raft.github.io/raft.pdf
- Lamport, *Paxos Made Simple* (2001) — https://lamport.azurewebsites.net/pubs/paxos-simple.pdf
- etcd tuning (election timeout, heartbeat) — https://etcd.io/docs/v3.5/tuning/
- Apache Kafka 4.0 release — https://kafka.apache.org/blog
- Brewer, *Spanner, TrueTime and the CAP Theorem* (2017) — https://research.google.com/pubs/archive/45855.pdf

## Files

| File | Kya |
|---|---|
| `lib/quorum.js` | majority, sahne layak failures, sab subsets ka overlap, binomial availability |
| `lib/election.js` | ex1 election model |
| `lib/price.js` | ex2 commit formula |
| `lib/uptodate.js` | ex3 election restriction model |
| `lib/reads.js` | ex4 reads timeline |
| `tools/*.js` | Har exercise ka tool |
| `test/core.test.js` | 5 tests |
| `captures/` | Asli runs (ex2: 3 runs) + `test.txt` |

## Practice

1. ex0 C mein jhatka 2% se 20% karo. 3 nodes ka p99 kya hota hai?
2. ex1 mein 4 ki jagah 2 nodes zinda rakho (majority 3). Kya leader banta hai?
3. ex2 mein RTT 5 ms (do AZ, ek region) karo. fsync ya RTT — kaun bada?
4. ex4 mein lease 200 se 350 ms karo. Ab dheemi ghadi ke bina bhi kya hota hai?
