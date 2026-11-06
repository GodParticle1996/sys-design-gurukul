# Lab 48 — queue kab bachati hai, kab sirf der chhupati hai?

System Gurukul → Playlist · 2 EDA Core → EDA Tradeoffs (Kyun · Kaise · Code · Kab).
Zero-dependency Node 18+. Teen simulation tools ek hi `lib/flow.js` aur `lib/queue.js` chalate hain (nakli ghadi);
`ex3-chain` asli HTTP par paanch Node processes chalata hai.

```bash
npm start -- ex0-slowmo --mode direct     # sale ka burst, bina queue (nakli ghadi)
npm start -- ex0-slowmo --mode queue      # wahi burst, queue ke saath; --json bhi
npm start -- ex1-level --profile burst            # 10 s burst: line bani, phir khaali
npm start -- ex1-level --profile burst --workers 2
npm start -- ex1-level --profile burst --no-queue
npm start -- ex1-level --profile sustained        # 10,000/min aate, 200/min nikalte
npm start -- ex1-level --profile sustained --workers 50
npm start -- ex2-offline                  # consumer 90 min band; retention aur dead-letter
npm start -- ex3-chain                    # asli HTTP: payment → stock → confirm, teen tarah
npm test                                  # 6 tests (ek asli HTTP chain run samet)
docker compose --profile ex3-chain up --build   # supplied, untested
```

Ports (sirf ex3-chain): api **5700**, broker **5701**, payment **5702**, stock **5703**, confirm **5704**.
Tool apne processes khud chalata aur band karta hai. **Is machine par Docker nahi; compose chalaya nahi gaya.**

## Lab ka daayra

- `ex0`–`ex2` **model** hain: har tick par aane wale messages queue mein, phir workers apni tay raftaar se nikaalte hain.
  Numbers lab ke chune hue scenario se hain (60/s burst, 20/s capacity, 10,000/min vs 200/min, 90 min offline);
  asli traffic ka measurement nahi. Teeno runs byte-identical (`captures/*-{1,2,3}.txt`).
- Queue RAM mein hai, bina hadd ki. Asli broker ki memory/disk limit, retention aur DLQ settings alag-alag hoti hain.
- `ex3-chain` ke 30/20/10 ms kaam aur 10 ms polling lab ki settings hain. Timing har run thodi badalti hai;
  neeche teen runs ki range hai (`captures/chain-{1,2,3}.txt`). Broker RAM mein; ack se pehle crash ka bachav nahi.
- "Dead-letter" yahan RabbitMQ jaisa model hai: lab mein dead-letter chalu karne par expired message RAM ki dead list mein bachta hai.
  Asli RabbitMQ mein DLX set hona akela bachne ki guarantee nahi: exchange, binding aur destination queue theek honi chahiye,
  aur forwarding fail ho sakti hai ([DLX](https://www.rabbitmq.com/docs/dlx)).
  Lab ki retention shart `umar > ttl` hai: bilkul 60 min purana message abhi rehta hai. Minute/second ke labels tick + 1 hain.
  SQS mein retention khatam hone par message delete hota hai; SQS ka DLQ `maxReceiveCount` se aata hai, expiry se nahi.

## ex0-slowmo / ex1-level — burst vs lagataar zyada load

Sale ka burst: pehle 10 second 60 order/s, phir 10/s; recs-service 20/s sambhalta hai. 60 second, 1,100 orders.

| Haal | Hue | Reject | Peak line | Line khaali | Sabse lamba intezaar |
|---|---:|---:|---:|---:|---:|
| Queue nahi (seedha call) | 700 | **400** | 0 | — | 0 s |
| Queue, 1 worker | 1,100 | 0 | 400 (10 s) | 50 s | **20 s** |
| Queue, 2 workers | 1,100 | 0 | 200 (10 s) | 17 s | 5 s |

Queue ne 400 reject ko intezaar mein badla: kaam bacha, par sabse purana order 20 s ruka.

Lagataar zyada load (video ka apna example): **10,000 aate, 200 nikalte, har minute**.

| Haal | 1 min | 5 min | 10 min | Sabse purana (10 min) |
|---|---:|---:|---:|---:|
| 1 worker | line 9,800 | 49,000 | **98,000** | 9 min |
| 50 workers (50 × 200 = 10,000/min) | 0 | 0 | 0 | 0 |

Line har minute 9,800 badhti hai aur kabhi khaali nahi hoti. Queue yahan load ko barabar nahi karti; sirf der aur
backlog badhati hai. Ilaaj raftaar ka hai: consumers badhao (yahan 50), ya producer par kaam kam/shed karo.

## ex2-offline — consumer band, messages kitni der ruk sakte hain?

Consumer 0–90 min band (deploy atka). 20 msg/min aate rahe. Wapas aakar 50 msg/min. 200 min, 4,000 messages.

| Retention | Hue | Phenke | Dead-letter | Line khaali | Sabse lamba intezaar |
|---|---:|---:|---:|---:|---:|
| 60 min, dead-letter nahi | 3,400 | **600** | 0 | 130 min | 60 min |
| 60 min, dead-letter chalu | 3,400 | 0 | **600** | 130 min | 60 min |
| 4 din | 4,000 | 0 | 0 | 150 min | 90 min |

Pehle 30 minute ke 600 messages 60 min retention se purane ho gaye. Dead-letter na ho toh chupchaap gaye;
lab mein dead-letter chalu ho toh alag line mein bache — kisi ko dead-letter messages dekhne aur dobara chalane padenge. 4 din retention mein sab bache,
par sabse purana 90 min ruka. "Messages hamesha safe" sach nahi: retention aur DLQ settings se tay hota hai.

## ex3-chain — jab har kadam ko pichhle ka nateeja chahiye

Payment (30 ms) → stock (20 ms) → confirm (10 ms). Paanch orders; #4 ka item `gulab-jamun` stock mein khatam.
Asli HTTP, paanch alag processes. Teen runs ki range:

| Raasta | Pehla jawab, median (paanchon orders) | Confirmed, median (4 safal orders) | Khatam stock wala order |
|---|---:|---:|---|
| Direct (har kadam agle ka intezaar) | 83–101 ms (yahi aakhri nateeja) | 85–108 ms | 64–85 ms mein error: `stock: gulab-jamun khatam` |
| Events, failure par chup | 9–10 ms (`pending`) | 126.5–149.5 ms | 1,500 ms baad bhi `pending` (teeno runs) |
| Events + `OrderFailed` khabar | 4–9 ms (`pending`) | 101.5–124 ms | 86–96 ms mein `failed (stock: …)` |

Median = beech ki value (chaar values par beech ki do ka ausat). Is machine par runs ke beech farak hai (pehla order
cold start ki wajah se dheema); har run mein events ka confirmed median direct se zyada raha.

Is lab ka events api turant `202 pending` deta hai (ye api ka chuna hua design hai). Order poora hone mein direct se
zyada waqt laga (har hop par polling). Failure ki khabar design na ki ho toh order hamesha pending dikhta hai.
Direct raaste mein failure `lib/http.js` ke zariye laut-ta hai: server helper error ko 503 + error body banata hai,
caller helper 503 dekh kar error throw karta hai. Jab user ko abhi nateeja chahiye, events zaroori kaam ka intezaar
khatam nahi karte; final event ka intezaar jodo toh user ka wait phir bhi rahega.

## Source ke daave aur sudhaar

Videos: *Here's when Event-Driven Systems should REALLY be used* (`Of-br0OG5ic`) aur
*Here's why Event-Driven Architecture might be a BAD choice* (`ttEYKoP53DM`), Software Developer Diaries.

- **"Message bus throttle karke slow service ko sambhaal leta hai" (10k/min vs 200/min).** Sirf burst ke liye.
  Lagataar zyada load par line badhti hi rehti hai (98,000 / 10 min). Azure Queue-Based Load Leveling pattern:
  "If your average producer rate exceeds the consumer rate, the queue continues to grow and latency increases."
  ([docs](https://learn.microsoft.com/en-us/azure/architecture/patterns/queue-based-load-leveling))
- **"Har haal mein messages safe hain; TTL ke baad DLQ mein chale jaate hain."** Setting par depend karta hai.
  SQS retention 1 minute se 14 din, default 4 din
  ([SetQueueAttributes](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_SetQueueAttributes.html));
  SQS DLQ redrive policy ke `maxReceiveCount` (message kitni baar receive hua par delete nahi hua) par chalta hai, aur standard queue mein DLQ mein jaane par bhi "the enqueue timestamp is unchanged"
  ([DLQ](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html)).
  RabbitMQ mein expire hua message "expires and is discarded"; dead-letter tabhi jab DLX set ho
  ([TTL](https://www.rabbitmq.com/docs/ttl), [DLX](https://www.rabbitmq.com/docs/dlx)).
- **"Ordering zaroori ho toh idempotency lagao."** Idempotency duplicate se bachati hai, kram se nahi. Kram ke liye
  sequence/version ya ek key ki ek partition chahiye (EDA topic 2 ka version check).
- **"Receiver khud autoscale karta hai, queue round-robin baant-ti hai."** Scaling alag autoscaler queue depth dekh ke
  karta hai; baant-ne ka tareeka broker aur prefetch par depend karta hai.
- **"3 se zyada sync hops ho toh event-driven bana do."** Tabhi jab user ko abhi nateeja nahi chahiye. ex3 dikhata hai:
  nateeja chahiye toh events intezaar ko pending mein badalte hain, aur failure ki khabar alag se design karni padti hai.
  Video ka apna pehla sawaal yahi hai: "does the caller need an immediate response?" Azure pattern bhi kehta hai ki
  pattern tab suitable nahi jab "The caller requires a low-latency, synchronous response."

## Files

| File | Kaam |
|---|---|
| lib/queue.js | RAM queue: FIFO, retention (ttl), phenko ya dead-letter |
| lib/flow.js | nakli ghadi: aate messages, workers ki raftaar, queue ya reject |
| lib/topics.js | ex3 ka broker: har topic ki ek line, read/ack |
| lib/step.js | ek kadam: direct mein agle ka intezaar, events mein agli khabar ya OrderFailed |
| lib/http.js | asli HTTP helper (lab 44 jaisa) |
| services/ | broker, api, step (payment/stock/confirm) |
| tools/profiles.js | lab ke tay scenario numbers |
| tools/slowmo.js · level.js · offline.js · chain.js | ex0 · ex1 · ex2 · ex3 |

1. `profiles.js` mein burst ko 10/s kam karo. Peak line aur sabse lamba intezaar kitna badla?
2. `offline.js` mein consumer wapas aakar 25 msg/min hi nikale. Line kab khaali hogi — hogi bhi?
3. `step.js` mein stock ko failure par bhi `OrderFailed` bhejne do par api ko `failed` topic na padhne do. User ko kya dikhega?
