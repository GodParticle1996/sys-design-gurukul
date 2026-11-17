# Request routing: service, instance and policy

Run from `sys-design-gurukul`:

```bash
node practical-labs/request-routing/run.cjs
```

Node's standard library is sufficient. No installation, database, account, network socket or shared service is used. This is an executable routing decision model. It does not claim to run an HTTP proxy, verify a token or perform a health probe. The caller supplies an already verified identity; in production, never treat a client-supplied user ID as authenticated identity.

Predict the target before running:

| Request, in order | Expected target | Why |
|---|---|---|
| `/orders/7` | `orders-a` | Orders route; first eligible orders instance |
| `/images/logo.png` | `images-a` | Images route; separate pool |
| `/orders/8` | `orders-b` | Next eligible orders instance |
| `/orders/9` | `orders-a` | Orders pool cycles |

The program prints five PASS lines. It checks four failures and boundaries:

1. Missing verified identity returns 401 before choosing a backend.
2. `orders-b` actually fails while the last health observation still says healthy. Selection produces 502. After updating the observation, the next orders request chooses `orders-a` and succeeds. Removing every known healthy orders target produces 503 in this model. The images pool still works.
3. One gateway admits two requests per principal per local ten-second window. Adding a third orders instance does not change the third response, 429. At the next window the request succeeds.
4. Two independent gateway instances each own a counter. Alternating requests admits four, even though each counter's local limit is two. A strict shared global limit needs a coordination design, including what to do when that shared state fails.

Change one thing at a time:

- Set `limit: 1` in the first experiment. Predict which assertion fails: the second request by Alice hits the shared local API budget even though it targets a different service. The budget key is the principal, not the service or backend.
- Change the images target's `service` to `orders`. Predict `/images/logo.png`: 503, because the route exists but its eligible pool is empty. Changing the path to `/unknown` instead gives 404 because no route exists.
- Remove the `knownHealthy` update in the failure experiment. Predict why later round-robin turns can keep selecting the failed target. A real deployment needs a measured health signal and enough remaining capacity.
- Replace the route boundary check with plain `startsWith(prefix)`. The `/orders-backup` assertion exposes the accidental match. This is a simple route table, not a complete URL parser; production handling must specify normalization and decoding.

The two-request window, 401/429/502/503 choices and fail-closed empty-pool behavior are explicit model policies. They are not universal gateway or AWS guarantees. Failed attempts after admission also consume the local budget. All requests run sequentially; this does not test distributed counters or production throughput.

For **actual network processes**, the existing [Lab 54](../../docker-labs/54-request-anatomy/README.md) includes separate L4/L7 proxies and backends. Follow that lab's environment instructions and `ex4-lb` command. L4 selects by connection; L7 can route by HTTP path. Recorded numbers in that README are historical captures, not measurements from this routing model. Current sandbox restrictions prevented a fresh network/browser run for this addition.

Source review: [API Gateway vs Load Balancer](../../../research/system-design-school/reviews/KGM9eSPeZ04/ANALYSIS.md). Primary references: [AWS target groups](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html), [gateway aggregation](https://learn.microsoft.com/en-us/azure/architecture/patterns/gateway-aggregation), [DNS TTL](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-basic.html).
