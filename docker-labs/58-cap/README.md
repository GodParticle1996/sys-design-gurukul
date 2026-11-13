# 🧪 Lab 58 — CAP aur PACELC: partition, replication, session guarantees, conflicts, split brain

System Gurukul → 🧪 First Principles → CAP & PACELC (Kyun · Kaise · Code · Kab).
Node 24+, koi package install nahi. Captures Node v24.18.0 par, WSL2 machine par. Koi port nahi.

```bash
npm start -- ex0-slow-vs-dead   # ASLI: worker thread 2 s atka vs sach mein band; 3 timeouts wale failure detectors
npm start -- ex1-partition      # MODEL (seeded): 5 nodes, network 3 | 2; 1,000 accounts par ATM withdrawals; CP vs 3 AP niyam
npm start -- ex2-pacelc         # ASLI timers + MODEL network: async vs sync-any-1 vs sync-all; latency aur primary crash
npm start -- ex3-session        # MODEL (seeded): 3 replicas ka lag; read-your-writes, monotonic reads, causal — galti aur ilaaj
npm start -- ex4-conflicts      # seeded: 60 s ka split; likes, naam, cart — LWW vs version vectors vs CRDT
npm start -- ex5-split-brain    # MODEL (seeded): quorum ke bina do leaders; zombie leader aur fencing token; five nines
npm test                        # 6 tests (har ek mein kai jaanch)
docker compose --profile ex1-partition up --build   # supplied, untested
```

**Is machine par Docker nahi; compose chalaya nahi gaya.**

## Lab ka daayra (kya asli, kya model)

- **ex0 asli hai:** asli worker thread, asli timers. Pause ek busy loop hai (GC pause jaisa), crash = `worker.terminate()`.
- **ex2:** timers asli, par network ka delay `setTimeout` se (paas 1 ms one-way, door 30 ms one-way = model). Koi disk nahi:
  "replica par pahuncha" = replica ki memory mein. Crash ka model: replica tak na pahuncha packet gaya.
- **ex1, ex3, ex5 model hain:** kaunsa node kisse baat kar sakta hai, aur kab kya pahuncha — seeded random se. Ginti asli
  code karta hai, par koi asli database, ATM network ya Raft nahi chalta (Raft ka asli lab: lab 09).
- **ex4:** CRDT aur version vector ka code asli hai (`lib/crdt.js`); split aur samay seeded.

## ex0-slow-vs-dead — atka hua node aur mara hua node bahar se ek jaise

```
$ npm start -- ex0-slow-vs-dead
Ping har 20 ms. Node t = 501 ms par atka; wapas jawab t = 2503 ms par.

timeout    Kahani 1: 2 s ka pause (node ZINDA tha)          Kahani 2: node sach mein band
  100 ms   "mara" kaha t = 585 ms par (JHOOTA alarm)       pakda 105 ms baad
  500 ms   "mara" kaha t = 989 ms par (JHOOTA alarm)       pakda 486 ms baad
 3000 ms   koi alarm nahi (sahi)                           pakda 2988 ms baad

Bahar se dono kahaniyan pehle ek jaisi dikhti hain: pong aana band. Chhota timeout = jaldi pakdo, par zinda
node ko bhi "mara" bolo. Lamba timeout = jhoota alarm nahi, par sach mein mara node der se pakda.
```

3 runs (ghadi pehle jawab se shuru): timeout 100 ms ne zinda node ko ~583–586 ms par "mara" kaha; asli crash 86–105 ms
mein pakda. 500 ms: jhoota alarm ~986–989 ms par; crash 486–494 ms mein. 3000 ms: jhoota alarm nahi, par crash
2,988–3,003 ms baad pakda.

- Ping ka jawab na aana do cheezon se ho sakta hai: node atka hai (GC, CPU, network queue) ya mara hai. Timeout sirf
  **shak** deta hai, saboot nahi (FLP 1985: bina timing bound ke crash ko pakka pehchaana nahi ja sakta).
- Chhota timeout = jaldi failover, par zinda node ko bhi nikaal doge (aur jaagne par zinda node purane leader ki tarah likh sakta hai —
  ex5). Lamba timeout = kam jhoote alarm, par asli crash par zyada der tak service ruki.

## ex1-partition — 5 nodes, network 3 | 2, ATM se paisa

```
$ npm start -- ex1-partition
niyam              withdraw OK (maj/min)   mana (maj/min)   balance check error   diya ₹      kitaab mein ₹   kitaab se gayab ₹   minus accounts   ₹100 se zyada diya ₹
CP quorum          1,000 / 0               0 / 1,000          768 (min taraf)       56,200      56,200          0                   0                0
AP + LWW           1,000 / 1,000           0 / 0                0 (min taraf)       1,11,620    55,420          56,200              0                22,840
AP + ledger        1,000 / 1,000           0 / 0                0 (min taraf)       1,11,620    1,11,620        0                   579              22,840
AP + offline ₹20   1,000 / 194             0 / 806              0 (min taraf)       59,170      59,170          0                   40               530

CP: 2 nodes wali taraf quorum (3 of 5) nahi bana sakti → har withdrawal aur balance check mana. Paisa kabhi zyada nahi gaya.
AP + LWW: dono taraf ne apna BALANCE likha; jodne par baad wala balance jeeta → ek withdrawal kitaab se gayab.
AP + ledger: dono withdrawals kitaab mein (CRDT jaisa); account minus mein dikhta hai, bank wasool kar sakta hai.
AP + offline ₹20: chhoti taraf sirf ₹20 tak deti hai → nuksaan ki seema tay. Asli ATM networks mein stand-in policy issuer se
baat na ho tab withdrawals ki seema tay karti hai.
```

- **CP (quorum 3 of 5):** badi taraf (3 nodes) chalti rahi; chhoti taraf ke saare 1,000 withdrawals aur 768 balance checks
  mana. Paisa kabhi ₹100 se zyada nahi diya. Poora system band nahi hota — sirf bina majority wali taraf.
- **AP + LWW:** dono taraf ne apna **balance** likha; jodte waqt baad wala balance jeeta → ₹56,200 ke withdrawals kitaab se
  gayab, aur 579 accounts mein ₹100 se zyada diya (kul ₹22,840).
- **AP + ledger:** dono withdrawals kitaab mein (har withdrawal ek entry, CRDT jaisa) → paisa phir bhi zyada gaya, par 579
  accounts minus mein dikhte hain — bank wasool kar sakta hai.
- **AP + offline ₹20:** chhoti taraf sirf ₹20 tak → 806 mana, nuksaan sirf ₹530. Asli ATM networks bhi issuer se baat na ho
  toh seemit "stand-in" withdrawals dete hain aur baad mein hisaab milaate hain — banks hamesha CP nahi.
- **Pichhle levels se mel:** 🌐 Distributed track ke CAP aur Eventual Consistency levels mein withdrawal ka niyam hai "balance
  se zyada kabhi nahi" — isliye un levels mein ATM CP hai aur paisa nikaalna eventual nahi. Offline ₹20 wala niyam jaan-boojh kar seemit overdraft maanta hai aur baad mein wasooli karta hai.
  Niyam (invariant) badla, isliye faisla badla.

## ex2-pacelc — normal din mein bhi: tez ya pakka?

```
$ npm start -- ex2-pacelc
A. Latency — 200 writes ek ke baad ek (har write ka "ho gaya" aane tak ka samay)
  async        median   0.00 ms   p99   0.03 ms
  sync-any-1   median   2.23 ms   p99   2.83 ms
  sync-all     median  60.63 ms   p99  61.11 ms

B. Primary mara — 300 writes (har 1 ms ka target), 300va write bhejte hi crash; "ho gaya" bole gaye writes mein se kitne kho gaye?
   Mara primary kisi ko jawab nahi deta: crash ke baad aane wale acks ke writes ko "ho gaya" nahi milta (natija pata nahi).
  async        crash t = 333 ms   "ho gaya" bola 300   naya primary = paas (1 ms)   naye primary mein nahi:  1   (agar door wala bane: 27)
  sync-any-1   crash t = 334 ms   "ho gaya" bola 298   naya primary = paas (1 ms)   naye primary mein nahi:  0   (agar door wala bane: 25)
  sync-all     crash t = 335 ms   "ho gaya" bola 246   naya primary = paas (1 ms)   naye primary mein nahi:  0   (agar door wala bane: 0)

async: tez, par crash par aakhri writes (packet raaste mein the) gaye. sync-all: latency = sabse dheema replica (~60 ms).
sync-any-1: latency ~ sabse tez replica; acked write kam se kam ek replica par — us replica ko primary banao.
```

3 runs: async median 0.00 ms; sync-any-1 2.23–2.24 ms (p99 2.52–2.83); sync-all 60.63–60.76 ms (p99 61.11–61.60).
Crash (300va write bhejte hi, asal mein t = 332–342 ms): async ne har run mein 1 acked write khoya (door wala replica
primary bane toh 27–28); sync-any-1 0 (door wala bane toh 23–25); sync-all 0. Mara primary jawab nahi deta, isliye
sync-all ne sirf 246–247 writes ko "ho gaya" bola — baaki ka natija client ko pata nahi.

- **Seema:** ex2 sirf "ho gaya" ki latency aur memory copies ka bachna naapta hai. Strong consistency ke liye padhne ka
  niyam aur safe failover bhi chahiye; lab linearizability test nahi karta.
- **E (else) mein L ya C:** partition na ho tab bhi sync replication ka matlab latency. sync-all = sabse dheema replica
  (~60 ms = door ka round trip). Postgres `synchronous_standby_names` mein `ANY 1 (…)` jaisa niyam = sabse tez replica jitna.
- **sync-any-1 ka kaanta:** acked write kam se kam **ek** replica par hai — par failover mein **us** replica ko primary banana
  hai. Door wala bana toh 23–25 acked writes gaye.
- **async:** "ho gaya" turant, par crash par raaste ke packets gaye. (Postgres mein primary ki disk bach jaaye toh writes
  primary ki disk par hain; lab mein disk nahi hai.)

## ex3-session — do session guarantees aur ek causal example

```
$ npm start -- ex3-session
Replica lag (har write par random): 0–200 ms, 0–1000 ms, 0–5000 ms. Har sawaal 10,000 baar.

a) Read-your-writes — bio badla, 300 ms baad apni profile kholi
   bina ilaaj                  purani bio dikhi: 5,456 (54.6%)
   5 s tak primary se padho    purani bio: 0      primary par reads: 10,000 (100.0%)
   version token               purani bio: 0      primary par reads: 5,456 (54.6%)  (baaki replica se)

b) Monotonic reads — score har 0.5 s badla, viewer ne 10 baar refresh kiya (har second)
   random replica              kam se kam ek baar score PEECHE gaya: 9,539 (95.4%) viewers
   ek hi replica se chipko     0
   "dekhe hue version se naya" token0

c) Causal — sawaal (shard Q, t = 0), jawab (shard A, t = 2 s); reader 2–6 s ke beech dono padhta hai
   bina ilaaj                  jawab dikha, sawaal nahi: 448 (4.5%)
   jawab ke saath "sawaal v1 chahiye"   0 — 448 baar jawab thodi der chhupa raha
```

- Terry et al. (1994) ki chaar session guarantees: read-your-writes, monotonic reads, writes-follow-reads, monotonic writes.
  Lab pehli do naapta hai, phir ek alag causal-dependency example (sawaal → jawab).
- **Read-your-writes:** bina ilaaj 54.6% baar apni purani bio dikhi (dono dheeme replicas 300 ms par peeche ho sakte hain:
  (0 + 0.70 + 0.94) / 3 ≈ 54.7%). Ilaaj ki keemat: version token
  ke saath 54.6% reads primary par gaye; "5 s tak primary" ke saath 100%. Time window tabhi chalti hai jab lag window se kam ho —
  asli lag ki koi pakki seema nahi, isliye version token zyada bharosemand.
- **Monotonic reads:** random replica par 95.4% viewers ne kam se kam ek baar score peeche jaate dekha. Ek replica se chipko
  ya "dekhe hue version se naya" token → 0.
- **Causal:** 4.5% baar jawab dikha par sawaal nahi (alag shards, alag lag). Jawab ke saath dependency ("sawaal v1 chahiye")
  → 0, keemat: 448 baar jawab thodi der chhupa raha.
- Ilaaj ke 0 design se aate hain (route ya chhupao); lab ilaaj ki **keemat** naapta hai. Session guarantees ek seedhi nahi —
  alag-alag hain, aur ek doosre ke bina bhi mil sakti hain.

## ex4-conflicts — split ke baad milaana

```
$ npm start -- ex4-conflicts
a) Likes counter — pehle 1,000; split mein A par 300, B par 200 (sach: 1,500)
   LWW (har taraf ne GINTI likhi, baad wali jeeti)   1,200  → 300 likes gayab
   G-Counter CRDT (har replica ka apna khaana)        1,500

b) Naam — 1,000 users, har user ka naam dono taraf badla; B ki ghadi 5 s peeche
   LWW                     har user ka ek write chupchaap gaya (1,000);  69 baar (6.9%) asal mein PEHLE wala write jeeta
   version vectors         1,000 conflicts pakde — dono versions rakhe, app/user tay kare

c) Cart — 500 carts {apple, bread}; split mein A ne apple hataya + chai joda, B ne dal joda. Iraada: {bread, chai, dal}
   LWW (poora cart, baad wala jeeta)       joda hua item gayab: 500   hataya apple wapas: 254
   dono versions ka union (Dynamo jaisa)   joda hua item gayab:   0   hataya apple wapas: 500
   OR-Set CRDT (add jeetta hai)            joda hua item gayab:   0   hataya apple wapas:   0
```

- **Likes:** dono taraf ne ginti likhi, LWW ne ek ginti rakhi → 300 likes gayab. G-Counter (har replica ka apna khaana,
  merge = har khaane ka max) → 1,500.
- **Naam:** LWW har user ka ek write chupchaap mitata hai; B ki ghadi 5 s peeche thi toh 6.9% baar asal mein pehle wala write
  jeeta (Cassandra jaise systems har cell ka sabse bada timestamp rakhte hain). Version vectors ne 1,000 conflicts **pakde**
  — dono versions rakho, app tay kare.
- **Cart:** LWW ne poora cart badla → har cart mein joda hua item gayab. Union (Dynamo 2007 jaisa) ne kuch nahi khoya, par
  hataya hua apple **wapas** aaya — Dynamo paper bhi wapas aaye items ki baat kehta hai. OR-Set (add jeetta hai) ne iraada sahi rakha.

## ex5-split-brain — do leaders, ek zombie

```
$ npm start -- ex5-split-brain
A. Election ka niyam
   no quorum        khud ko leader maanne wale 2   commit kar sakne wale 2   "ho gaya" bola 1,000   mana   0   jodne par gayab (bola tha "ho gaya") 395
   majority quorum  khud ko leader maanne wale 2   commit kar sakne wale 1   "ho gaya" bola 605   mana 395   jodne par gayab (bola tha "ho gaya") 0

B. Zombie leader — GC pause se jaaga, term 1 ke 50 purane writes storage ko bheje (naya leader term 2 par 100 likh chuka)
   bina fencing                 storage ne mane 150   thukraaye  0   aakhri value old-49  ← PURANE leader ki
   fencing token (term) check   storage ne mane 100   thukraaye 50   aakhri value new-99  

C. Kitne nines, saal mein kitna downtime (365.25 din)
   99     %   87 h 39 min 36.0 s
   99.9   %   8 h 45 min 57.6 s
   99.99  %   52 min 35.8 s
   99.999 %   5 min 15.6 s
```

- **Bina quorum:** dono taraf commit karne wala leader; chhoti taraf ke 395 writes ko "ho gaya" bola, jodte waqt chhoti taraf
  ki branch phenki gayi. **Majority quorum:** purana leader 5 ab bhi khud ko leader maan sakta hai (term 2 ki khabar nahi),
  par commit nahi kar sakta → same 395 writes mana (client ko error). Raft ek term mein ek hi leader deta hai (lab 09 bhi do
  terms ke do leaders dikhata hai).
- **Zombie:** purana leader GC se jaag kar term 1 ke 50 writes storage ko bhejta hai. Bina fencing → aakhri value purane
  leader ki. Storage term check kare (fencing token) → 50 thukraaye.
- **Five nines** = saal mein ~5 min 15 s (365 din: 5 min 15.36 s; 365.25 din: 5 min 15.6 s). Five nines service downtime ka
  budget hai; ek replica ka reboot service band kare zaroori nahi. CAP ka "A" alag cheez hai (har zinda node jawab de).

## Source ke daave aur sudhaar

Codex ne video 8 ke daave primary sources se jaanche (`sdg-codex-xp/jobs/fp8/CLAIMS-REVIEW.md`).

| Video kehta hai | Sach / sudhaar | Kahan se |
|---|---|---|
| "CA jhooth hai", partition par C ya A | Partition na ho toh C aur A dono mil sakte hain; partition par **prabhavit operations** ke liye dono ki guarantee nahi. Faisla har operation ka alag ho sakta hai | Brewer 2012 |
| CP mein node B band karo | Band nahi — B us operation ko mana karta hai ya rokta hai; majority wali taraf chalti hai | ex1, Raft §5 |
| 5 nodes mein 3 baat na kar sakein toh poora system writes band | 3 \| 2 split mein 3 wali taraf commit karti hai; sirf 2 wali nahi | ex1, ex5 |
| Banks CP hote hain, ATM mana karta hai | Asli ATM networks seemit stand-in withdrawals dete hain, baad mein hisaab | Brewer 2012 (ATM sidebar), Mastercard rules |
| Strong consistency global social network tak scale nahi karti | Spanner globally strong consistency deta hai (technically CP) | Brewer 2017 |
| Transatlantic 100 ms | 6,000 km fibre: ~30 ms one-way, ~60 ms round trip (propagation); route aur queue alag | fibre ~2c/3 |
| PACELC = "PAC ELK" | **PACELC**, Abadi (2010/2012). Abadi ne PA/EL **Dynamo**, Cassandra, Riak ko kaha — aaj ka DynamoDB strong reads bhi deta hai | Abadi 2012, DynamoDB docs |
| Sync replication latency = sabse dheema replica | Sirf "sab ka intezaar" mein. `ANY 1` jaisa niyam = sabse tez | ex2, Postgres docs |
| Postgres sync commit = PC/EC | `synchronous_commit = on` akela sirf local disk ka intezaar bhi ho sakta hai; synchronous standbys, sahi read routing aur safe failover chahiye | Postgres docs |
| Single-node Postgres = linearizable | Isolation level par: default Read Committed | Postgres docs |
| Consistency ek seedhi | Read-your-writes, monotonic reads alag session guarantees | Terry et al. 1994, ex3 |
| Session ko ek node par chipkao = read-your-writes | Tabhi tak jab us node par tumhare writes hain; failover par version check chahiye | ex3 (token) |
| Cassandra default LWW, "most NoSQL" bhi | Cassandra har cell ka sabse bada timestamp; "most NoSQL" bina source | Cassandra docs, ex4 |
| Dynamo cart mein duplicate items | Paper ki asli anomaly: **hataye hue items wapas** | Dynamo §4.4, ex4 |
| Figma aur Google Docs CRDT | Figma: central server, CRDT se prerit (khud "true CRDT nahi" kehta hai). Google Docs: operational transformation | Figma 2019, Google 2010 |
| Five nines = 5 min 15 s | 365 din: 5 min 15.36 s | ex5 |
| "Refine with Paxos" | PACELC ki baat thi; Paxos consensus protocol hai | Abadi 2012 |
| Sharding se "infinite data" | Sharding baant'ta hai, replication copy karta hai; dono ki seema hai | — |

## Sources

- Brewer, PODC 2000 keynote — https://sites.cs.ucsb.edu/~rich/class/cs293-cloud/papers/Brewer_podc_keynote_2000.pdf
- Gilbert & Lynch, *Brewer's Conjecture…* (2002) — https://www.comp.nus.edu.sg/~gilbert/pubs/BrewersConjecture-SigAct.pdf
- Brewer, *CAP Twelve Years Later* (2012) — https://www.infoq.com/articles/cap-twelve-years-later-how-the-rules-have-changed/
- Abadi, *Consistency Tradeoffs in Modern Distributed Database System Design* (2012) — https://www.cs.umd.edu/~abadi/papers/abadi-pacelc.pdf
- Terry et al., *Session Guarantees for Weakly Consistent Replicated Data* (1994) — https://www.cs.cornell.edu/courses/cs734/2000FA/cached%20papers/SessionGuaranteesPDIS_1.html
- Vogels, *Eventually Consistent* (2008) — https://www.allthingsdistributed.com/2008/12/eventually_consistent.html
- Shapiro et al., *CRDTs* (2011) — https://asc.di.fct.unl.pt/~nmp/pubs/tr-inria-2011.pdf
- Dynamo (2007) §4.4 — https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf
- Fischer, Lynch, Paterson (1985) — https://www.cs.cornell.edu/courses/cs614/2004sp/papers/FLP85.pdf
- Raft — https://raft.github.io/raft.pdf · Brewer on Spanner (2017) — https://cloud.google.com/blog/products/databases/inside-cloud-spanner-and-the-cap-theorem
- Postgres `synchronous_standby_names` — https://www.postgresql.org/docs/current/runtime-config-replication.html
- Figma multiplayer (2019) — https://www.figma.com/blog/how-figmas-multiplayer-technology-works/

## Files

| File | Kya |
|---|---|
| `lib/crdt.js` | G-Counter, OR-Set (add jeetta hai), version vectors |
| `lib/bank.js` | ex1: 5 nodes, 3 \| 2 split, 4 niyam |
| `lib/pacelc.js` | ex2: primary + 2 replicas, async / sync-any-1 / sync-all, crash |
| `lib/session.js` | ex3: replica lag model, read-your-writes / monotonic / causal |
| `lib/conflicts.js` | ex4: likes, naam (ghadi skew), cart |
| `lib/splitbrain.js` | ex5: election niyam, zombie + fencing, downtime |
| `lib/node-worker.js`, `tools/*.js` | ex0 ka worker; har exercise ka tool |
| `test/core.test.js` | 6 tests |
| `captures/` | Asli runs (ex0, ex2: 3 runs) + `test.txt` |

## Practice

1. ex0 mein pause 2 s se 400 ms karo. Kaunsa timeout ab jhoota alarm nahi deta?
2. ex1 mein split 4 | 1 karo. CP mein kitne log mana sunenge?
3. ex2 mein door wala replica 30 ms se 5 ms karo. sync-all ki latency?
4. ex4 mein B ki ghadi 5 s **aage** karo. LWW kiske writes zyada rakhega?
