# Ek event, kitne kaam?

Teen orders aaye. Har order ka inventory, payment aur notification kaam chahiye. Ek shared queue par teen different handlers lagane se har handler ko har order nahi milta.

Repo root `sys-design-gurukul` se run karo. Node 24+ existing SQLite exercises ke liye chahiye. Topology script ko network, package install ya Docker nahi chahiye.

```bash
node practical-labs/message-topology/run.cjs
```

Run se pehle predict karo: three events × three independent subscriptions = kitni pending copies? Payment ke do workers hain. Kya payment ko six logical jobs milenge?

| Observed experiment | Meaning |
|---|---|
| Shared queue: inventory=o1, payment=o2, notify=o3 | Empty queue does not prove every order's three business tasks finished. |
| Independent subscriptions: pending 3/3/3 | Nine copies represent three different reactions per order. |
| Payment workers receive o1,o2; finish o2,o1 | Workers share the payment work. Delivery order does not force completion order. |
| After all payment acknowledgements: pending 3/0/3 | Payment completion does not complete inventory or notify. |
| Offline notify later reads o1 | This live RAM object kept the copy; no TTL or restart occurred. |
| Fresh broker pending=0 | New object has no old state. This is not a real process-crash experiment. |
| Lost ack: p1 attempted twice | Lease expiry allows a retry. Work sharing does not guarantee one business effect. |
| Lab 44 cap=1: full notify rejects publication | This lab deliberately couples publication to all subscription capacities. |

Seven assertions groups run. The script imports the actual RAM implementations from Labs 44 and 49. The clock and worker invocation order are controlled. The script does not run concurrent threads, a cloud broker, or external payments. Fanout publication in this script is a sequential loop, not a transaction across brokers. Lab 49's lease model is stricter than some providers; do not infer that every real queue prevents duplicate concurrent delivery. A stale worker can still attempt external work after its lease expires.

## Retry ka real database effect

```bash
node docker-labs/49-eda-races/start.js ex0-slowmo --story phantom --mode none --fast
node docker-labs/49-eda-races/start.js ex0-slowmo --story phantom --mode paymentId --fast
```

Same `p1` is processed before the acknowledgement, then delivered again at the chosen 310 ms timestamp. Without deduplication, SQLite records `p1,p1`. With the payment ID constraint, SQLite records one `p1`. The first run's second write is a duplicate effect. The second run's second delivery is still real within the model, but its duplicate database effect is suppressed. This slow-motion story models a worker crash; it does not kill a process or charge a bank.

## Offline subscriber: retention badlo

```bash
node docker-labs/48-eda-tradeoffs/start.js ex2-offline
```

Chosen model: 20 arrivals/minute, consumer offline for 90 minutes, then capacity 50/minute. Across 200 minutes, 4,000 messages arrive. Retention 60 minutes discards 600; 3,400 finish. Retention four days discards zero; 4,000 finish. The model's optional dead-letter setting moves the 600 expired messages to another list. Expiry-to-dead-letter is this model's policy, not an SQS default. Dead-letter means waiting for investigation, not successful processing.

## Khud badlo, phir explain karo

1. Topology script mein payment ka third worker add karo. Same three pending copies share hongi; three new event copies automatically create nahi hongi.
2. `leaseMs` ko 100 se 200 karo. At 100 ms, `receive()` returns null. Move the second receive to 200 ms to demonstrate expiry again. Assertions ko expected boundary ke saath update karo.
3. Notify ko read/ack karke capped bus khaali karo. Next publish accepted hoga. An independent-capacity design ko per-subscription failure and recovery contract chahiye.
4. Payment before stock reservation fail ho jaaye toh order ka result kya hoga? Three subscriptions completion ordering enforce nahi karti. Explicit workflow states, dependent commands and compensation need separate design.

Interview answer: pehle kaun-kaun sa business kaam har event par chahiye, phir workers ka bantwara. Uske baad retention, retry safety, ordering key, backlog limits and failure recovery specify karo. “Queue” ya “Pub/Sub” naam akela guarantees ka answer nahi.

Provider reference: [Google subscriptions](https://docs.cloud.google.com/pubsub/docs/subscription-overview), [SQS standard queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues.html), [Redis Pub/Sub delivery](https://redis.io/docs/latest/develop/pubsub/), [SNS to SQS](https://docs.aws.amazon.com/sns/latest/dg/sns-sqs-as-subscriber.html). Provider behavior was checked against documentation; no provider was run here.
