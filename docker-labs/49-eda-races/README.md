# Lab 49 — events ki race conditions: ulta kram, khoya update, phantom failure

System Gurukul → Playlist · 2 EDA Core → EDA Races (Kyun · Kaise · Code · Kab).
Zero dependency, **Node 24+** (built-in `node:sqlite`; Node 22.13 se pehle ye module flag ke bina nahi chalta). Broker aur consumers alag Node processes hain, asli HTTP par;
sab ek hi asli SQLite file mein likhte hain. `ex0-slowmo` wahi broker aur apply code nakli ghadi par chalata hai.

```bash
npm start -- ex0-slowmo --story order --mode shared     # ek order, do consumers (A 5 ms, B 40 ms)
npm start -- ex0-slowmo --story order --mode keyed      # ek key ek waqt ek consumer
npm start -- ex0-slowmo --story phantom --mode none     # likha, ack se pehle crash, dobara aaya
npm start -- ex0-slowmo --story phantom --mode paymentId   # --json bhi
npm start -- ex1-order        # asli processes: shared | keyed | buffer | buffer-gap
npm start -- ex2-conflict     # asli processes: unsafe | cas | atomic, phir set vs delta ka kram
npm start -- ex3-phantom      # asli crash: none | userAmount | arrival | paymentId
npm test                      # 10 tests (teeno asli-process tools aur 4 failure-path tests samet)
docker compose --profile ex3-phantom up --build   # supplied, untested
```

Ports: broker **5800**; consumers 5801–5802 (ex1), 5811–5812 (ex2), 5821 (ex3). Har tool apne processes khud chalata,
crash par dobara chalata (ex3 ka supervisor) aur aakhir mein band karta hai; DB ek temp folder mein banta aur mit-ta hai.
**Is machine par Docker nahi; compose chalaya nahi gaya.**

## Lab ka daayra

- Broker RAM mein hai (`lib/broker.js`): competing consumers, lease (ack na aaye toh lease ke baad dobara, `attempt` badhta),
  aur `keyed` mode jismein ek key ka ek hi message ek waqt lease par hota hai. Asli brokers mein: Kafka mein key se partition
  aur partition ka kaam kram mein; RabbitMQ mein key ke hisaab se alag queues, har queue par single active consumer aur kram
  mein processing. Ek RabbitMQ queue par SAC lagane se poori queue ek hi active consumer ko milti hai, baaki standby rehte hain.
- **Lease ki seema:** normal run mein kaam 5/40 ms aur lease 2 s hai, toh kaam lease ke andar khatam hota hai. Kaam lease se
  lamba chale toh broker message doosre worker ko de deta hai, par purana worker abhi bhi DB mein likh sakta hai. Lease akeli
  purane worker ka DB write nahi rokti: ownership ya sequence ki jaanch bhi chahiye. Lab mein `ack` ke saath `attempt` bhi
  jaata hai, taaki purana worker naye worker ki delivery ka ack na kar de (test mein jaancha).
- **Error par saaf rehna:** `inOrder` aur `charge` SQL error par `ROLLBACK` karte hain (warna connection adhura transaction
  pakde rehta aur agla message bhi atakta). Pehle likha seq dobara aaye toh `duplicate`, buffer mein nahi jaata. Tool 20 s
  mein khatam na ho toh error deta hai, adhura DB state result nahi maanta.
- `ex0-slowmo` ki `line=` ginti = ack-baaki messages: line mein pade **aur** consumers ke paas lease par, dono. Message
  uthne par ginti nahi ghatti; ack par ghatti hai.
- Consumer ki speed (A 5 ms, B 40 ms), lease (300 ms / 2 s) aur 20 ms ka read-write gap lab ki settings hain.
- `ex1-order` ki race timing par tiki hai: har run mein ginti badalti hai. Shared mode 13 baar chalaya (`captures/order-*.txt`
  ke 3 runs + `order-shared-10runs.txt`); neeche range in 13 runs ki. `ex2`, `ex3` aur `ex0` ke teeno runs byte-identical rahe.
- Crash asli hai: consumer `process.exit(1)` karta hai charge likhne ke baad aur ack se pehle (sirf pehli delivery par).

## ex1-order — competing consumers ne kram toda

3 orders × 5 haalatein (placed → paid → packed → shipped → delivered), pehle saari line mein, phir A aur B ek saath.

| Mode | Ulte kram mein likhe | Galat aakhri haalat | Buffer mein atke |
|---|---:|---:|---:|
| shared (koi bhi consumer koi bhi message) | **2–3**, har run mein | 12 runs mein 0; ek run mein **2** (`o2,o3=shipped`) | 0 |
| keyed (ek order ek waqt ek consumer) | 0 | 0 | 0 |
| buffer (agla seq hi likho, baaki buffer) | 0 | 0 | 0 |
| buffer-gap (o2 ka #3 kabhi aaya hi nahi) | 0 | `o2=paid` | **2** (#4, #5) |

Ulte kram ke writes har run mein hue, par 13 mein se 12 runs mein aakhri haalat phir bhi sahi dikhi — isliye aisi bugs
testing mein chhoot jaati hain. Buffer kram bachata hai, par ek khoya number baaki updates ko hamesha ke liye rok deta hai
(timeout/alert/resync chahiye). Buffer aur "last processed" yahan SQLite mein hain; RAM mein hote toh restart par kho jaate.

## ex2-conflict — do consumers, ek balance

Account 1,000; 20 events "+10" (sahi nateeja 1,200); do consumer processes. Teeno runs byte-identical.

| Mode | Balance | Khoye updates | Koshishein (20 events ke liye) |
|---|---:|---:|---:|
| unsafe: padho → 20 ms → likho | **1,100** | **10** | 20 |
| cas: `WHERE version = ?`, fail ho toh dobara | 1,200 | 0 | **39** |
| atomic: `balance = balance + 10` | 1,200 | 0 | 20 |

Kram ka asar (bina broker): **set events** (balance = 90, phir 100) ulte kram mein 90 chhodte hain (sahi 100).
**Delta events** (+100, −30) dono kram mein 1,070 dete hain — jodna kram par tika nahi. Par niyam lagao "balance minus mein
nahi" aur 0 se shuru karo: sahi kram 70, ulta kram 100 (−30 reject hua). Delta tabhi kram se azaad hain jab koi niyam beech
ki haalat par tika na ho.

## ex3-phantom — likha, ack nahi gaya, dobara aaya

Do payments, dono user u1 ke ₹100: p1, aur p2 (asli doosri khareed). Consumer p1 ka charge likh ke ack se pehle crash.
Supervisor consumer ko dobara chalata hai; 300 ms lease ke baad p1 dobara milta hai. Sahi nateeja: p1 aur p2 ek-ek baar.

| Duplicate pakadne ki key | Charges | Nateeja |
|---|---|---|
| koi nahi | 3: p1, p2, p1 | p1 do baar kata |
| user + amount (`u1:100`) | 1: p1 | **p2 asli khareed thi, duplicate maan ke chhod di** |
| user + aane ka waqt | 3: p1, p2, p1 | dobara aaya p1 naye waqt par — pakda nahi |
| payment id (producer ka), charge ke saath ek transaction | 2: p1, p2 | sahi |

`processed` table mein key `PRIMARY KEY` hai aur `INSERT OR IGNORE` + charge ek `BEGIN IMMEDIATE` transaction mein:
key aur charge saath likhe jaate hain ya dono nahi. Pehle SELECT se jaancho phir alag se INSERT karo — do consumers ke beech
ye jaanch race kar sakti hai. Aane ke waqt wali key do alag payments ko ek hi millisecond mein ek jaisi bhi bana sakti hai
(lab ke test mein ye dikha); isliye test har delivery alag millisecond mein karta hai.

## Source ke daave aur sudhaar

Video: *The Hardest Problems in Event-Driven Architectures* (`skb6-JaBNQw`), Software Developer Diaries.

- **Out-of-order events: "last processed + buffer" se theek.** Kaam karta hai, par ek khoya number baaki sab rok deta hai
  (ex1 buffer-gap), aur buffer durable hona chahiye. Aam pehla ilaaj: ek key ke saare messages ek waqt ek hi consumer ko.
  Kafka: "Events with the same event key ... are written to the same partition", aur consumer "will always read that
  partition's events in exactly the same order as they were written"
  ([Kafka intro](https://kafka.apache.org/41/getting-started/introduction/)). Ye padhne ka kram hai; rebalance purane
  consumer ka shuru hua DB write cancel nahi karta, toh DB writes ke liye pending kaam sambhalo aur purane writes roko.
  RabbitMQ ka single active consumer "useful when messages must be consumed and processed in the same order they arrive"
  ([consumers](https://www.rabbitmq.com/docs/consumers#single-active-consumer)), par SAC poori queue par lagta hai: key ke
  hisaab se parallel kaam ke liye key se alag queues chuno. Kai consumers par "any redelivery can change order"
  ([queues](https://www.rabbitmq.com/docs/queues)).
- **"Distributed conflicts": 90 aur 100 ke balance, par code mein +100 aur −30.** Jodna kram par tika nahi, isliye "bad
  consumer" ka balance sahi aaya — sahi balance "compensation" se nahi aaya. Asli conflict hai do consumers ka ek saath padhna-likhna:
  ex2 mein 20 mein se 10 updates khoye. Ilaaj compare-and-swap (version) ya DB ka atomic update. "Message ko line ke
  peeche bhej do" kram ki guarantee nahi deta.
- **Phantom failure: "publisher ko ack nahi mila, publisher dobara bhejta hai".** Consumer ka ack aur publisher confirm alag
  cheezein hain: RabbitMQ ke docs mein "The two features, however, are entirely orthogonal". Ack na ho aur channel band ho
  toh broker khud "any delivery (message) that was not acked is automatically requeued"; consumers "must be prepared to
  handle redeliveries and otherwise be implemented with idempotence in mind"
  ([confirms](https://www.rabbitmq.com/docs/confirms)).
- **Idempotency key "user ID + amount" ya "user ID + timestamp".** ex3: user+amount ne asli doosri payment kaat di;
  aane ka waqt dobara aaye message ko nahi pakadta. Key producer ki stable pehchaan ho (payment id / event id), aur effect
  ke saath ek hi transaction mein unique constraint se likhi jaaye.

## Files

| File | Kaam |
|---|---|
| lib/broker.js | RAM broker: lease, redelivery, `keyed` (ek key ek waqt), ack mein `attempt` ka mel |
| lib/store.js | asli SQLite file (WAL, busy timeout) aur tables |
| lib/apply.js | setStatus · inOrder (buffer, purana seq = duplicate) · addUnsafe / addCas / addAtomic · charge (keys) · error par ROLLBACK |
| lib/http.js | asli HTTP helper (lab 44 jaisa) |
| services/broker.js · consumer.js | HTTP broker; ek consumer process (ROLE order / balance / pay) |
| tools/stack.js | processes chalao, crash par dobara chalao, band karo |
| tools/slowmo.js · order.js · conflict.js · phantom.js | ex0 · ex1 · ex2 · ex3 |

1. `order.js` mein B ka delay 40 se 5 ms karo. Ulte kram ki ginti kya hui — race gayab hui ya chhupi?
2. `apply.js` ke `addCas` mein gap 20 se 0 ms karo. Koshishein kitni bachi?
3. `charge()` mein key ko transaction ke bahar alag SELECT se jaancho, aur do consumers chalao. Kya duplicate wapas aaya?
