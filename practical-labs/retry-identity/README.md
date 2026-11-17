# Timeout ke baad: same purchase ya naya charge?

System Gurukul folder mein Node se run karo. Packages, network ya payment account nahi chahiye.

```bash
node practical-labs/retry-identity/run.cjs
node practical-labs/retry-identity/run.cjs unknown
node practical-labs/retry-identity/run.cjs deadlines
```

Lab six independent experiments chalati hai. `identity`, `retention`, `serverDelay` aur `jitter` bhi individually run kar sakte ho. Provider **RAM model** hai; deadline **fake clock** par calculate hoti hai. Real SQL transaction/crash practice [SQL Gurukul](../../../sql-gurukul/practical-labs/request-replay/README.md) mein hai.

Har row par pehle prediction bolo. Phir run karke reason compare karo.

| Experiment | Expected observation | Reason |
|---|---|---|
| identity | Same key retry: 1 payment; har attempt ki new key: 3 | Key ek logical purchase ko pehchaanti hai. Same body wali second purchase ko new identity chahiye. Account bhi identity ka part hai. |
| unknown | Missing report: `in_doubt`; matching success: `captured`; confirmed rejection: `failed` | Timeout ya absent report failure ka proof nahi. Local state reset remote effect undo nahi karta. |
| retention | Old key delete karke retry: 2 payments | Primary key/map deleted identity ko forever yaad nahi rakhti. Real provider retention contract check karo. |
| deadlines | 5 calls × 2s + waits 1+2+4+8s = 25s | 15s sirf waits hain. 12s budget mein starts 0,3,7s; third call ends at 9s. Next allowed start 13s hai, isliye stop. |
| serverDelay | 8s server wait, 9s deadline, first call 2s: no retry | Earliest next call 10s hai. Wait ko 7s karke server instruction mat todo. Stop/defer according to the operation contract. |
| jitter | 1,000 attempts five time bins mein; sum 1,000; largest bin >200 | 200 expected average hai, hard maximum nahi. Random delay capacity ya duplicate protection nahi deti. |

`jitter` seeded example repeatable hai. Video ka histogram reproduce karne ka claim nahi. Delay range `[500,1000)` ms hai; full jitter ka range `[0,cap)` alag hai. Bin occupancy attempted calls count karti hai, measured server throughput nahi.

## Change, observe, explain

1. `identity()` mein retry key `order-8` karo. Second payment banegi. **Repair:** purchase record ki stable identity retries aur app restart ke across retain karo. UUID retry loop ke andar mat banao.
2. `reconcile()` mein absent report ko `failed` set karo. Existing assertion fail hogi: report lag raha hai, charge already hua hai. **Repair:** unknown rakho; supported status lookup, webhook/report aur manual recovery path define karo. Har unknown result automatically resolve hone ka promise mat karo.
3. `retention()` se `prune()` hatao. Last assertion fail hogi: duplicate charge ab 1 rahegi. **Explain:** old key ki safety receiver ke retained record par depend karti hai, string repeat karne par nahi.
4. Deadline 12s se 16s karo. Starts `0,3,7,13s`, last call ends 15s. Next wait 8s budget se bahar hai. Timeout client wait rokta hai; remote work cancel hone ka proof nahi.
5. Three layers ko **3 retries each** bolo. Worst-case calls `4×4×4=64`; **3 attempts each** `3×3×3=27`. Failure har layer mein poori attempt allowance consume kare tab bound milta hai. One retry owner plus deadline/budget se multiplication control karo.

## Project aur interview decision

Payment status uncertain ho toh pehle stable identity, scoped parameters, provider retention aur status evidence check karo. HTTP 503 akela safe retry ka permission nahi. Business effect pehle ho sakta hai. Changed amount ko same key ke under silently accept mat karo. Real API ko authorization **replay par bhi** check karni hai; this model has no authentication layer.

Queue acknowledgement lost ho toh duplicate delivery possible hai. Existing [event dedup SQL lab](../../../sql-gurukul/practical-labs/event-dedup/README.md) local effect ki transaction boundary test karti hai. Broker delivery guarantee apne aap external payment ko atomic nahi banati.

References: [HTTP intended idempotent effect](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2), [Retry-After](https://www.rfc-editor.org/rfc/rfc9110.html#section-10.2.3), [Stripe API v1/v2 distinctions](https://docs.stripe.com/api/idempotent_requests), [Stripe uncertain errors](https://docs.stripe.com/error-low-level), [Pub/Sub exactly-once scope](https://docs.cloud.google.com/pubsub/docs/exactly-once-delivery). Verify the API version used by a real project; this lab does not implement Stripe.
