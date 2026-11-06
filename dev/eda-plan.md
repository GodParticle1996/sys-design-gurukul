# EDA Core — implementation and coverage

Started 2026-10-20 with the user's approval. Track: `sdd-eda`, always unlocked, free order, first on the home screen.
No commit or push is authorized: the GitHub remote deploys the live site.

## Ready: first topic, four levels

`ed-kyun` → `ed-kaise` → `ed-code` → `ed-kab`, in `data-v2-eda-1…4`.
Lab: `docker-labs/44-event-driven`, ports 5400–5404.

- Direct call chain: order saved and kitchen effect completed, then notification failure produces a failed API response.
- Event flow: separate subscription copies, independent progress, work before consumer ack, accepted vs completed.
- Real source panes: `lib/order.js`, `lib/bus.js`, `tools/mini.js`; actual native Node EventEmitter demonstration.
- Limits: repeated read before ack can repeat an effect; a full bounded subscription rejects publication; save and publish are separate operations; an actual broker process restart loses RAM state.
- Official RabbitMQ docs distinguish one work queue shared by workers from fanout to independent queues. RabbitMQ itself was not run.

Raw measurements are stored under the lab's `captures/` folder (no git commit was made):

- `slowmo-direct.json` / `slowmo-events.json` and matching text: actual same-library state changes under a fixed clock, with artificial delays explicitly labelled.
- `compare-1.txt` … `compare-3.txt`: actual HTTP. Direct median 248–250 ms (four 503s), event API median 4–7 ms (four 202s). Both save four orders and complete four kitchen effects. Notify pending four until the worker returns.
- `crash-1.txt` … `crash-3.txt`: own child broker PID stopped and restarted, kitchen 4→0 / notify 4→0. Eight pending copies lost after successful publish replies.
- `limits.txt`, `mini.txt`, `emitter.txt`: exact output, repeated three times with identical text.

Five behavioral tests cover independent payload copies, read/ack semantics, rejecting fanout before partial enqueue, the save/publish failure gap, and direct-call failure after earlier effects. Docker compose remains untested on this machine.

## Source coverage and corrections

Use the user's Video-Translate tool. First bundle:
`/home/vibekdutta/VixiApps/video-translate/vu_output/sd5-eda-beginner/` — transcript available, ten sampled frames and contact sheet inspected.
Source title: *A Beginner's Guide to Event-Driven Architecture*, video ID `RojKJnF_WWQ`.

The first topic covers the foundational flow and event-notification mechanics. It does **not** claim to finish all the overview's patterns.
Event-carried state transfer, event sourcing and CQRS remain below. Lesson screens never refer to the source presentation or timestamps.

Points requiring care as coverage grows:

- Publishing is not proof that a consumer completed its work; a successful publisher reply also needs a defined durability guarantee.
- A broker is more than one shared queue. Two business consumers needing every event need independent progress, not accidental work sharing.
- HTTP vs non-HTTP is not the distinction between business synchrony and event reactions; this lab deliberately transports events over HTTP polling.
- An event names a fact; a command requests work. Their ownership, failure and completion contracts matter beyond naming.
- Do not repeat the overview's implication that event-carried state transfer always requires old/new diffs. Verify this separately from primary sources and build a measured payload exercise.
- Event sourcing is not synonymous with Kafka, snapshots, full-state copies or CQRS. Treat these separately and verify each primary-source claim.
- Do not describe event/CQRS applications as automatically non-critical or automatically faster end to end. Define the promise and measure completion.

Primary documentation used in the first topic is linked in lab 44's README: Node Events, RabbitMQ Work Queues, RabbitMQ Publish/Subscribe.

## Ready: second topic, Event Payloads (2026-11-06)

`ep-kyun` → `ep-kaise` → `ep-code` → `ep-kab`, in `data-v2-eda-payload-1…4`, group "📦 Event Payloads", guide `event-payloads`.
Lab: `docker-labs/47-event-payloads` (ports 5600–5604), built by Codex; Codex's sandbox blocked TCP, so Claude ran the
real HTTP captures: 18/18 runs, three byte-identical runs per experiment, equal to the in-process model; 12 tests pass over HTTP.
`--brief` prints one line per mode (captures/brief-*). Levels written by Claude from the captures; Codex fact-checked them
(13 findings: a wrong bin answer for backfill, a two-answer question, a dry-run step showing the copy saved at the counter
line, overstated "hamesha drift", contiguous-version assumption, per-consumer payload routing for privacy) — all fixed.
Source corrections taught: ECST does not require old/new diffs (Fowler 2017: consumers "don't need to contact the source
system"); a thin callback that returns the whole order is not privacy-safe; resync restores current state, not missed work.
Also fixed `aws-constant-work`: a lost delta can be repaired by the check's next full-value update; drift is not "hamesha".

## Remaining EDA Core work

The playlist was refreshed through Video-Translate on 2026-10-20: 64 entries, including one unavailable entry. Track titles and video IDs; positions have shifted.

| Source | Stable video ID | Planned coverage |
|---|---|---|
| A Beginner's Guide to Event-Driven Architecture | `RojKJnF_WWQ` | Basics ready; payload/state transfer, event sourcing and CQRS still to build |
| Here's when Event-Driven Systems should REALLY be used | `Of-br0OG5ic` | Measured coupling and work-completion tradeoffs |
| Here's why Event-Driven Architecture might be a BAD choice | `ttEYKoP53DM` | Same tradeoff topic: a simple flow vs the operational cost |
| The Hardest Problems in Event-Driven Architectures | `skb6-JaBNQw` | Delivery, ordering, retry/replay, duplicate effects and visibility |
| Event Sourcing: Genius or Just Over-Engineering? | `wXg_aON4oj8` | Append events and reconstruct state; snapshots and read models separately |
| 4 Event-Modeling Mistakes in Event-Driven Architectures | `m3mY3Ra-BcI` | Contracts, naming, payloads and schema evolution, each backed by a lab |

Done: event payloads; EDA tradeoffs (below). Next: delivery problems, event sourcing/CQRS and event modeling.

## Ready: third topic, EDA Tradeoffs (2026-11-06)

`et-kyun` → `et-kaise` → `et-code` → `et-kab`, in `data-v2-eda-tradeoffs-1…4`, group "⚖️ EDA Tradeoffs", guide `eda-tradeoffs`.
Sources: *Here's when Event-Driven Systems should REALLY be used* (`Of-br0OG5ic`) and *Here's why Event-Driven Architecture
might be a BAD choice* (`ttEYKoP53DM`); transcripts in video-translate `vu_output/sd5-eda-when`, `sd5-eda-bad`.
Lab 48 (built by Claude): fixed-clock model for burst vs sustained load and consumer-offline retention/dead-letter
(byte-identical runs), plus a real-HTTP payment → stock → confirm chain (ports 5700–5704; three runs, ranges).
Corrections taught: a queue only levels bursts (Azure: average producer rate above consumer rate grows the queue);
"messages are always safe" depends on retention and DLQ settings (SQS deletes expired messages; its DLQ is maxReceiveCount;
RabbitMQ dead-letters expired messages only with a DLX); idempotency handles duplicates, not ordering; "3+ hops → events"
only when the caller does not need the result now (lab's 202-pending API: median reply 4–10 ms, median confirm of
successful orders 101.5–149.5 ms vs direct 85–108 ms over three runs). Codex fact-checked the topic: 19 findings, all fixed
(FIFO max-wait = backlog / total capacity; HTTP helper carries errors across services; pending deadline is a warning, not
proof of failure; SQS counts receives; DLX alone does not guarantee saving; median helper; slowmo/level tool output). Max XP grew to 53,450, so the top ranks moved to 45,500 / 50,000 (xp-test keeps the top rank at 90–95%).
Read the relevant source and primary docs before choosing the exact split. Keep the KhanaKart world and four-question course shape.
Outbox, CDC and DLQ have their later Messaging theme; show the failure here without claiming those topics already have new playlist lessons.

Next free lab number: 49. Lab 44 uses 5400–5404; inspect all current ports before assigning a new range.
