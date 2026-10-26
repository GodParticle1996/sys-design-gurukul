# Resilience teaching audit: sources and boundaries

Reviewed on 2026-10-23. The 160 questions in the backpressure, breaker,
retries, noisy-neighbor and randomness playlist topics now have individually
authored distractors and per-option explanations. Source answer indexes remain
unchanged; renderers shuffle presentation. These 160 questions have zero length
bias flags under the 1.15 / 0.85 check.

The original local captures remain historical evidence. No Docker, brokers,
cloud environments or real clusters were started for this audit. Simulator
timings and configured failure rules demonstrate a mechanism; they are not
universal product performance or memory-failure guarantees.

## Backpressure

- [Node.js streams](https://nodejs.org/api/stream.html): in the normal writable
  example, `write(false)` accepts the current chunk and tells the producer to
  wait for `drain` before additional writes. It is not a request to resend the
  chunk. Error/destroyed-stream handling is a separate concern. `highWaterMark`
  is a threshold, not a hard memory cap. `pipeline()` composes error cleanup;
  plain `pipe()` is not equivalent.
- [RabbitMQ queue length](https://www.rabbitmq.com/docs/maxlength): limits count
  ready messages, not unacknowledged deliveries. Default overflow removes or
  dead-letters oldest ready messages. Rejection/confirm behavior and supported
  overflow settings depend on queue type and configuration.
- [Kafka 4.1 consumer configuration](https://kafka.apache.org/41/configuration/consumer-configs/):
  default `max.poll.interval.ms` is 300,000 ms. Heartbeats do not remove the
  application progress deadline. Static membership changes reassignment timing;
  pausing partitions is not permission to stop polling indefinitely.
- [RFC 9110 Retry-After](https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after):
  standard delay values are integer seconds or an HTTP-date. The existing
  250 ms lab uses a custom `retry-after-ms` header plus a standards-compatible
  rounded `Retry-After`; subsecond console labels are teaching shorthand.

## Breakers and retries

- [Opossum](https://github.com/nodeshift/opossum): sample windows, minimum volume,
  strict threshold comparison and `errorFilter` must match the pinned example.
  Per-operation grouping is a failure-domain decision, not a mandate to create
  one breaker for every URL. An expected 404 is not automatically an
  infrastructure outage; classifier policy follows the endpoint contract.
- [Amazon Builders Library](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/):
  bounded timeouts, retries, backoff and jitter address different mechanisms.
  Retrying every layer can multiply downstream pressure. Breaker/retry
  composition determines whether attempts or whole operations enter statistics.
- [p-retry 8](https://github.com/sindresorhus/p-retry/tree/v8.0.0) and
  [gRPC retry proposal](https://github.com/grpc/proposal/blob/master/A6-client-retries.md):
  options named randomization do not imply one universal full-jitter formula.
  Distinguish total attempts from additional retries: three layers with three
  total attempts can cause 27 calls; three additional retries means four
  attempts, so the same three-layer maximum can be 64.
- [Stripe idempotency](https://docs.stripe.com/api/idempotent_requests): an
  idempotency header is useful only with a documented server-side contract,
  scope, retention and payload matching. Unknown response outcome is not proof
  of rollback. Reuse the same logical operation key/body; otherwise reconcile.
- The displayed retry helper uses `for (let n = 0; ; n++)`, with an empty loop
  condition. Its explicit final-attempt return enforces the attempt limit;
  removing that guard allows repeated retryable failures to loop past the
  configured maximum. The explanation now names that exact code boundary.

## Isolation and randomized routing

- [Kubernetes resource management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/):
  CPU requests affect scheduling and relative CPU shares; CPU limits apply a
  CPU-time quota and normally throttle rather than OOM-kill. A quota is not an
  assertion that the process runs on exactly one physical core at every instant.
- [NGINX upstream module](https://nginx.org/en/docs/http/ngx_http_upstream_module.html):
  the default is weighted round robin. `least_conn` counts active connections;
  the lab's local dispatched-minus-completed requests are a simplified signal.
  HTTP keep-alive, HTTP/2 multiplexing, background work and other proxies make
  local request counts different from global server load.
- [Original Raft paper](https://raft.github.io/raft.pdf): randomized election
  timeouts reduce split-vote probability, but do not guarantee one-round success.
  Two-choice routing selects the lower observed load of sampled candidates;
  it is not hedged duplicate dispatch or a universal global-optimum guarantee.

## Major-topic guidance

`data-guidance.js` provides 53 authored topic guides with explicit assignments
for all 244 levels. Each contains a why-first explanation, tiny example,
hands-on direction, use/avoid conditions, comparison, decision tree, common
mistake, production behavior, interview follow-up and primary references.
Historical company stories retain their existing dated source context;
invented arithmetic examples are marked `Kalpanik`.

`tools/replay-exercises.js` drives 967 static action fixtures through the actual
renderers, first directly and again after wrong actions/keyboard activation.
It checks that completion occurs only after the final intended action and that
renderers do not mutate shared lesson data. External-lab walkthrough completion
is explicitly self-reported; previewing its observation question cannot complete
the checklist or verify external commands.
