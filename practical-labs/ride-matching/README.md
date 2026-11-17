# Nearby driver se confirmed assignment tak

Run System Gurukul folder mein:

```bash
node practical-labs/ride-matching/run.cjs
```

Node standard library only. File/server/payment create nahi hota. Six deterministic experiments hain. Pehle table ka prediction likho, phir run karke compare karo.

| Experiment | Pehle predict karo | Expected result aur reason |
|---|---|---|
| 1. Cell edge | Rider x99 aur A x102; cell width100. Same cell search A ko laayegi? | Nahi. Radius5 ka complete cover + exact filter A laata hai. B=(104,55) rider(99,50) se7.07m hai; B reject hota hai. |
| 1. Bigger radius | Radius250 mein current cell +8 neighbors always enough? | Nahi. C x300 is201m away but outside that fixed neighborhood. |
| 2. Quadtree | Thirty distinct drivers same coordinate share karte hain. Tree kitni deep? | Maximum8. Last bucket records retain karti hai. Full scan aur tree exact-radius results agree. |
| 2. Movement | Authoritative coordinate change, tree unchanged. Final filter enough? | Nahi. Missing candidate filter tak nahi aata. Lab rebuild ke baad new point milta hai. |
| 3. Offer | O1 expired; O2 belongs to R2. Late O1 Accept? | Reject O1, retain O2. O2 acceptance retry returns same A1. |
| 4. Cancel race | Cancel-first versus Accept-first? | Serialized order determines transition. Old O1 cleanup cannot release O2. Accept at exact expiry rejects. |
| 5. Location | Sequence12 ke baad11; duplicate12 at29s; TTL ends30s? | Keep12, duplicate does not refresh timer, expire at30. Authorized session8 rejects old session7. |
| 6. Capacity | 10M rides/day versus1M active drivers/4s? | 115.74 average rides/s versus250,000 scheduled location updates/s. 18.25TB is raw ride records only. |

## Code badlo, reason dekho

1. `nearby()` mein final distance filter temporarily remove karo. A ke saath corner B aa jaayega; assertion fail honi chahiye. Filter restore karo.
2. `cover()` ko fixed current cell mein badlo. A missing hogi. Radius250 example explain karta hai ki fixed3×3 neighborhood bhi general repair nahi.
3. `Quad.insert()` ka maximum depth8 se4 karo. Correct results same rehne chahiye; larger leaf buckets possible hain. Depth limit remove mat karo: coincident points ke saath recursion unbounded ho sakti hai.
4. `accept()` mein current offer identity guard bypass karne se expired/old state checks bhi inspect karo. Safe design multiple conditions check karta hai. Old O1 ko current O2 samajhkar accept karna invariant todta hai: one driver cannot belong to two active rides.
5. `LocationOwner.update()` mein rejected old/duplicate packet ka receive time refresh karo. Freshness assertion fail hogi. Stale packets driver ko online nahi rakhne chahiye.
6. `capacityCase()` mein `activeDrivers` ko500,000 karo. GPS result125,000/s hoga. Expected assertion bhi new explicit requirement ke hisaab se update karo; ride rate unchanged rahegi.

## Design decision khud bolo

“Radius coverage candidates laati hai. Exact distance, freshness aur availability eligibility decide karte hain. Assignment owner current offer ID aur expiry atomically check karta hai. Accepted offer ka result retries ke liye save hota hai. Trip-start later transition hai.”

Straight-line distance road ETA nahi. Nearby service availability copy stale ho sakti hai; final ownership decision authoritative state par hona chahiye.

## Proof boundary

Grid and quadtree use local Cartesian metres. They are not geohash, S2 or H3 implementations, and do not handle poles, dateline or Earth geodesics. The quadtree rebuild is a small maintenance demonstration, not a recommended fleet update strategy.

Assignment methods execute synchronously in one JavaScript process. They prove these serial transition guards, not distributed atomicity, database durability or network delivery. There is one current offer per driver; multi-offer dispatch needs a different policy. Driver/request authentication is assumed before owner calls. No trip fare, payment, real cancellation fee or cross-store transaction is implemented.

Location TTL uses accepted server receive time. That does not prove the observation is recent after transport delay. A real service needs an observation-age and clock-skew policy. Reconnect generation is issued by the model owner; clients cannot allocate it.

For actual spatial database queries and query plans: [SQL spatial-query practical](../../../sql-gurukul/practical-labs/spatial-query/README.md). For real conditional claims: [SQL seat-claim practical](../../../sql-gurukul/practical-labs/seat-claim/README.md).
