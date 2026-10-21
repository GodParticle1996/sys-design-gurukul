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

Suggested next topic: event payloads/state transfer, then EDA tradeoffs, delivery problems, event sourcing/CQRS and event modeling.
Read the relevant source and primary docs before choosing the exact split. Keep the KhanaKart world and four-question course shape.
Outbox, CDC and DLQ have their later Messaging theme; show the failure here without claiming those topics already have new playlist lessons.

Next free lab number: 45. Lab 44 uses 5400–5404; inspect all current ports before assigning a new range.
