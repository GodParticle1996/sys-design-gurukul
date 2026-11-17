# 10 Patterns: source numbers ki shart check karo

System Gurukul mein `#level=classify`, `#level=probabilistic` aur `#level=saga` kholo. Har run se pehle prediction likho. Yeh original, deterministic models hain. Redis, broker, object store, payment provider ya real traffic run nahi hote.

App folder (`sys-design-gurukul`) mein Node se run karo:

```bash
node practical-labs/pattern-checks/run.cjs          # saare 8
node practical-labs/pattern-checks/run.cjs shards
node practical-labs/pattern-checks/run.cjs ring
node practical-labs/pattern-checks/run.cjs hll
node practical-labs/pattern-checks/run.cjs retry
node practical-labs/pattern-checks/run.cjs bucket
node practical-labs/pattern-checks/run.cjs parts
node practical-labs/pattern-checks/run.cjs copies
node practical-labs/pattern-checks/run.cjs saga
```

| Experiment | Pehle predict karo | Worked result aur reason (2026-11-16 run) |
|---|---|---|
| shards | 100,000 users, `hash mod 4` → `mod 5`: kitne hilenge? | Shards 24,953 / 25,040 / 24,831 / 25,176. 79.6% hile. Key tabhi rukti hai jab `h mod 20` 0–3 ho: 4/20 rukti, 80% hilti. Date key: aaj ke saare posts ek hi shard par. |
| ring | Ring par 5th shard: har baar ≈20%? | Ek point per shard, 30 layouts: mean 22.0%, min 0.3%, max 66.1%. 100 points per shard: mean 19.9%, 16.3%–23.6%. Source ka ≈19% ek layout ka result hai. |
| hll | 16,384 registers: error kabhi 1% se upar? | Theory 1.04/√16,384 = 0.8125% standard error; 12,288 bytes registers. 200 sets × 100,000 ids: RMS 0.72%, 32/200 sets mein error > 1%, worst 2.07%. Overlap 10,000 vs union ka 1 SE ≈ 16,169. |
| retry | Waits 1, 2, 4, 8; har try 3 s: dead-letter kab? | 5 attempts, 4 retries, waits 15 s. 5 × 3 + 15 = 30 s. |
| bucket | Bucket 20, +10/s: 30 ek saath? | Bhara bucket: 20 pass, 10 reject; 1 s baad 30: 10 pass. t=0 par 15 use, t=0.5 par 30: 10 pass, 20 reject. |
| parts | 2 GB / 5 MB parts? | 2 GiB / 5 MiB = 409.6 → 410 (aakhri 3 MiB); 2 GB / 5 MB = 400. Part 300 par toota: store 1–299 confirm karta hai → 300 se 111 parts bhejo. |
| copies | 400,000 reads/s, 10 copies: busiest server? | Hash placement: 4 servers → 4 used, busiest 160,000/s; 10 servers → 6 used, 120,000/s; 40 servers → 7 used, 120,000/s. Copy count machine count nahi. |
| saga | Refund timeout, phir retry: kitna refund? | Same key: ₹500 (provider pehla result lautata hai). Naya key: ₹1,000 — double refund. |

Model ki seemayein:

- HLL ek simple 32-bit-hash implementation hai (Redis jaisa register count). Redis ke sparse/dense encodings, bias tables aur 64-bit hash ko reproduce nahi karta. Dikhana sirf itna hai ki standard error ek typical phailaav hai, upper limit nahi.
- Ring aur copies SHA-1 ke pehle 32 bits par `mod` ya sorted points use karte hain. Asli systems explicit placement, replication aur rebalancing use karte hain.
- Saga provider ek RAM object hai jo idempotency key yaad rakhta hai. Asli provider ka key scope, retention aur error codes uske docs se check karo.
- Retry case jitter aur deadline nahi jodta. Uske liye `practical-labs/retry-identity` dekho.

Ek input badlo, pehle output explain karo:

1. `shards`: `% 5` ko `% 8` karo (4 → 8). Ab kitne hilenge? (50%: `h mod 8` ya toh `h mod 4` ke barabar hai ya 4 zyada.)
2. `ring`: vnodes `100` ko `10` karo. Spread kitna chauda hoga?
3. `hll`: `p = 14` ko `p = 12` karo (4,096 registers). Theory 1.04/64 = 1.625%. Kitne sets 1% se upar jaayenge?
4. `bucket`: capacity 20 → 30. Bhara bucket 30 requests mein kitni pass karega? Average rate badla?
5. `saga`: provider ke andar `if (!done.has(key))` check hata do (provider key yaad nahi rakhta). Ab same key par bhi ₹1,000 kyun? (Idempotency provider ko implement karni padti hai; client ki key akeli kaafi nahi.)

Interview mein worked line: "Signal: ek post par 400,000 reads/s. Pattern: hot key copies. Shart: copies alag servers par hon; writes har copy update karein. Check: busiest server ka load naapunga."

Further reading: [Redis HyperLogLog](https://redis.io/docs/latest/develop/data-types/probabilistic/hyperloglogs/), [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests), [Amazon S3 multipart upload limits](https://docs.aws.amazon.com/AmazonS3/latest/userguide/qfacts.html). Source diagrams aur arithmetic ne review motivate kiya; learner examples aur code independently likhe gaye hain.
