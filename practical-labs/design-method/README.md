# One design method: promises before boxes

Har exercise mein pehle result predict karo. Phir command run karo. Output ka reason ek sentence mein bolo. Last mein ek input change karke dobara predict karo.

Commands **sys-design-gurukul folder** se run karo. Node.js standard library enough hai. Koi install, server, account ya credentials nahi chahiye.

```bash
node practical-labs/design-method/run.cjs
```

Six experiments run honge. Ye independently authored deterministic models hain. Real queue, Redis, object storage, network, payment service ya production performance test nahi hain. SQL companion actual temporary SQLite operations chalati hai.

## 1. Queue: capacity kab usable hoti hai?

```bash
node practical-labs/design-method/run.cjs backlog
```

**Predict:** arrivals100/s until60s, then20/s. Service starts20 jobs/s until90s, then100/s. Empty initial queue. Ready capacity90s par milti hai. At60s and90s kitne jobs waiting honge? Backlog kab zero hoga?

**Observe:** queue60=4800, queue90=4800. At90s oldest queued cohort entered at18s, so age72s. After90s net drain100−20=80/s;4800/80=60s. Queue zero at150s. A new job joining behind4800 waits about48s to start under steady100/s FIFO. Job execution time extra hai.

**Explain:** equal arrival and service rates queue ko grow hone se rokti hain, empty nahi karti. Oldest elapsed waiting time aur a new job’s estimated future wait same metric nahi.

**Change:** `simulate(90)` to `simulate(120)`. Existing assertions intentionally fail until you update predicted answers: at120s queue4800, oldest age96s, drain complete180s. Do not change every assertion merely to get green; calculate first. Model dispatch per one-second bucket hai, individual production service times nahi.

**Interview:** exact667 arrivals/s,3 seconds/run,8 concurrent runs/machine →ceil(667×3/8)=251 machines before headroom. Approximate250 useful order-of-magnitude hai; guaranteed adequate capacity nahi. Source graph’s30k peak and45s wait need an explicit arrival/service schedule. Constant667−60 for120s produces72,840, so those labels alone cannot establish the source curve.

## 2. Upload: kaunsi bytes ready hain?

```bash
node practical-labs/design-method/run.cjs upload
```

**Predict:** generation1 finished after owner replaced the upload with generation2. Current version needs480p,1080p and a stored manifest. Can old1080p make new upload ready?

**Observe:** old generation, unauthorized callback and wrong checksum reject. Current480p alone is not ready. Both qualities without manifest still not ready. Current manifest makes ready true. Duplicate480p does not add another quality.

**Explain:** video ID names the product; version identifies the bytes. Lab computes actual hashes for fixture strings but models storage and authorized callbacks. Production must validate actual stored outputs, permissions and checksums; a callback’s own claim is insufficient.

**Change:** declare only480p required. Prediction: after480p still false until manifest. Before changing assertions, describe UI policy: “480p available; higher qualities processing.” Never relabel limited quality as all qualities complete.

**Interview:** how will upload overwrite, callback replay, worker restart and a failed rendition affect publication? Explain database state plus recoverable work handoff. [S3 presigned URL behavior](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html) permits reuse until expiry and same-key replacement; the URL itself does not prove one immutable upload.

## 3. Search: delete ke baad old edit

```bash
node practical-labs/design-method/run.cjs search
```

**Predict:** canonical full-state revision3 deletes post17. Revision2 edit arrives later. Index starts empty. TeamB also has post17 revision1.

**Observe:** TeamA retains deletion3; edit2 and duplicate3 skip. TeamB revision1 remains independent. A stale result list returns neither a deleted post nor a currently unauthorized post.

**Explain:** store the deletion’s revision marker, called tombstone. Removing all evidence of revision3 lets an old event appear new. Tenant and document identity scope the version. Current access checks are a separate boundary.

**Change:** in your temporary experiment, delete the marker before delivering edit2. Predict the resurrection before observing the failed assertion. Restore the marker. Then explain when old event retention would allow safe marker cleanup. Delta events require gap handling; this model uses complete state.

**Interview:** database full-text search can be enough; a separate search cluster has extra indexing/recovery/freshness work. Run [SQL search practice](../../../sql-gurukul/practical-labs/design-method/README.md) for AND versus phrase and transactional updates.

## 4. Chat: reconnect race

```bash
node practical-labs/design-method/run.cjs chat
```

**Predict:** Bob has contiguous cursor3. DB has4,5. Naive client fetches4,5, then6 commits, then client subscribes. Can a quiet connection remain stuck at5?

**Observe:** yes. Revised path confirms subscription, buffers events, reads high-water mark5, buffers new6, replays4,5 and merges6. Duplicate6 has one effect. Dropped live7 is recovered by durable catch-up. Separate probe receives5 before4 and keeps cursor3 until4 arrives.

**Explain:** subscribe-before-replay closes the handoff gap under the modeled ordering. It cannot make a lossy notification service durable. [Redis Pub/Sub semantics](https://redis.io/docs/latest/develop/pubsub/) require a separate recovery path when messages are missed.

**Change:** remove periodic DB catch-up. Predict that cursor remains6 after the dropped7. Then change arrival order to4,5 and explain why the contiguous cursor can advance immediately.

**Interview:** durable message plus fanout intent, sender saved acknowledgement, device-delivered receipt and read receipt are four different states. The lab assumes one authorized stream with contiguous sequence numbers. Filtered history needs a suitable server resume token; expired history requires explicit resync.

## 5. Tickets: waiting room vs ownership

```bash
node practical-labs/design-method/run.cjs admission
```

**Predict:** Bob’s signed token covers C7/session s2 until900. Can Bob use it for C8, another user or after expiry? Does admission grant A12?

**Observe:** wrong concert/user/session, exact expiry, tampered payload and replay reject. Bob is admitted once but does not own Alice’s seat.

**Explain:** cryptographic integrity checks and authorized claims solve different problems. This fixture chooses one-use admission; a different product can issue a checkout-session grant with its own usage policy. Lab uses a fixed test key and local replay set. Production signing keys, shared usage state, recovery and rate limits are separate work.

**Change:** give the request a different seat without changing concert. Token admission may pass; seat claim still needs authoritative ownership. Run [SQL holds exercise](../../../sql-gurukul/practical-labs/design-method/README.md) for old-owner rejection and atomic sale/payment-intent writes.

**Interview:** a signed admission token is not a reservation. A temporary reservation is not a completed payment. Payment authorization, capture, void/refund and reconciliation need explicit product states.

## 6. Feed: overlap, privacy and a stable page

```bash
node practical-labs/design-method/run.cjs feed
```

**Predict:** push and pull both includeP2. P3 is private to Alice; P4 is deleted. P1 andP2 share timestamp100. Order is timestamp descending, then ID descending.

**Observe:** Bob getsP2,P1,P5. Page afterP2 retains tiedP1. Alice gets onlyP3. Duplicate IDs, inaccessible content and deleted content are absent.

**Explain:** stable post identity handles overlap. Current content checks handle visibility. The complete ordering tuple handles timestamp ties. These assertions use a fixed snapshot; live ranking and membership changes need their own pagination contract.

**Change:** grant Bob visibility toP3. Predict P3 becomes first. Then change active read count in the cost example. Cost model assumes1 unit per push and5 units per pull merge. CaseA:24 posts/day×100k followers=2.4M push units vs1000 reads×5=5000 pull units. CaseB:1 post×100k=100k push vs1M reads×5=5M pull. Same followers, opposite estimated work preference.

**Interview:** choose push/pull using measured workload, cost and latency. Define transition cutoff/backfill and deduplicate overlap. Follower threshold100k is an example, not a rule.

## Seven-case decision drill

| Operation | Success means | Deep-dive decision | Existing lesson |
|---|---|---|---|
| Submit code | Durable accepted job; verdict can be pending | Bounded queue, recovery, fair workers, isolation | [Workers](../../index.html#level=cc-workers), [judge isolation](../../index.html#level=colab-isolation) |
| Upload video | Upload stored; play-ready is a later defined state | Immutable version, required qualities, manifest, private media access | [YouTube](../../index.html#level=youtube) |
| Create short link | Mapping committed and immediately usable under chosen contract | Fresh read path, collision-free allocation and restart identity | [URL Shortener](../../index.html#level=bitly), [ID/contract decisions](../../index.html#level=sds-contracts-kab) |
| Publish searchable post | Post durable; search visibility may lag | Durable indexing intent, revisions, tombstones and authorization | [Search](../../index.html#level=search) |
| Send message | Message durably saved; delivery/read receipts separate | Fanout recovery, reconnect overlap and contiguous cursor | [WhatsApp](../../index.html#level=whatsapp) |
| Buy seat | Current authorized buyer wins conditional sale | Admission, expiring ownership, payment reconciliation | [Ticketmaster](../../index.html#level=ticketmaster) |
| Read feed | Authorized deduplicated page under declared order | Push/pull cost, transition boundary, complete cursor | [Fanout](../../index.html#level=fanout) |

Source: [How to Solve (Almost) Any System Design Interview (1 Method)](https://www.youtube.com/watch?v=e8H8d0irqLg). Review: all1,743 available extracted candidates and full captions. One final candidate missing; source graph/number assumptions are qualified in the research review. Exercises and data here are original, not source screenshots or a production reference implementation.
