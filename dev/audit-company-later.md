# Later company topics: independent review

Reviewed on 2026-10-23: 201 literal MCQs plus adjacent lessons, diagrams and
flashcards in `data-st-12-whatsapp.js`, `data-st-13-roblox.js`,
`data-st-14-notion.js`, all `data-ai-*` and all `data-pl-*` files.
Original answer indexes remain unchanged. Every question has per-option reasons,
and these 201 have zero length-bias flags after the review.

No external lab was executed. Existing console captures remain historical/local
evidence. Their numeric outcomes are not current provider limits or SLAs.

## Correctness changes

- **Roblox party reservation polarity:** the correct answer previously said
  nearest routing split friend groups because seats *were* reserved. The
  actual `docker-labs/27-roblox/services/matchmaker.js` reserves party seats in
  smart mode; nearest mode does not. Option 0 and its explanation now describe
  missing reservation. The intended action index and replay fixture are intact.
- **Erlang process memory:** removed the claim that a process takes a few
  hundred bytes. The [official process guide](https://www.erlang.org/doc/system/eff_guide_processes.html)
  gives one version-specific 64-bit example of 327 words / 2,616 bytes, including
  a 233-word initial heap. Mailboxes, shared binaries and socket buffers make
  actual connection memory workload-dependent. The Node idle-socket RSS delta
  is a different measurement, and worker-thread RSS is not a universal native
  thread allocation rule.
- **BEAM scheduling and failure:** removed fixed one-scheduler-per-core and
  exact reduction-budget guarantees. Scheduler configuration, normal BEAM
  execution and native work differ. [Erlang NIF documentation](https://www.erlang.org/doc/system/nif.html)
  explains why native crashes can affect the emulator. Scheduling reduces
  interference but is not a promise that one faulty task cannot affect latency.
  Historical connection counts no longer assert an unqualified same-hardware
  guarantee.
- **Encrypted media:** sharing an existing encrypted object reference can avoid
  re-upload, but independently randomized encryption need not create the same
  ciphertext or digest for the same plaintext. Separate blob transport and
  scoped key/reference distribution do not imply universal plaintext dedup.
  Existing [Signal protocol references](https://signal.org/docs/specifications/doubleratchet/)
  remain the basis for key-evolution boundaries; this review does not claim the
  toy media flow is a production protocol implementation.
- **gVisor:** removed the assertion that every escape requires exactly two
  independent bugs, and the assertion that overhead exists only at syscalls.
  The [security architecture](https://gvisor.dev/docs/architecture_guide/intro/)
  describes layers and threat boundaries; the [performance guide](https://gvisor.dev/docs/architecture_guide/performance/)
  covers platform, memory, CPU, syscall, network and filesystem effects. The
  Node TCP-sentry experiment is explicitly a toy, not a measured gVisor or GPU
  benchmark. Ordinary mapped user-memory accesses do not require one syscall
  each.
- **Copy-on-write undo:** cheap reference forks are not free storage/compute.
  Overlay writes, retained base versions and cleanup still cost resources.
  Files/DB restore does not undo already-sent email, payments or other external
  effects; reconciliation/idempotency contracts remain necessary.
- **Hash-table collision math:** the roughly 63% large-N result is now tied to
  one tagged user sharing a uniformly selected bucket with another of N users,
  using N buckets. Equal cardinality does not imply a bijection. This is the
  stated occupancy model, not proof that every finite random assignment must
  collide.
- **Constant-state reconciliation:** a valid newer authoritative full snapshot
  can repair missed deltas. It does not automatically repair a corrupt source,
  stale version, failed delivery or invalid configuration. Model checking is
  scoped to a specified bounded model and successfully completed search, rather
  than all unbounded production states. See the original
  [Raft specification model](https://raft.github.io/raft.pdf) for the distinction
  between modeled protocol invariants and an implementation/environment.
- **Kademlia:** healthy routing can have expected logarithmic behavior; not
  every response guarantees a new matching bit or unconditional progress.
  [BEP 5](https://www.bittorrent.org/beps/bep_0005.html) describes iterative closer
  contact discovery. A trusted expected info hash verifies metadata binding,
  not arbitrary publisher identity. [BEP 3](https://www.bittorrent.org/beps/bep_0003.html)
  separately describes content piece verification and transfer.
- **LEDBAT:** classified [RFC 6817](https://www.rfc-editor.org/rfc/rfc6817.html)
  as Experimental delay-based background congestion control. Removed universal
  current Windows/Apple deployment and bufferbloat-cure claims.
- **Spatial/routing scope:** all-pairs counts on a finite graph are large or
  quadratic, not literally infinite. The one-level local overlay example does
  not imply that every multilevel routing index updates exactly one cell;
  affected higher-level structures can also need refresh. The original
  [Customizable Route Planning paper](https://www.microsoft.com/en-us/research/publication/customizable-route-planning/)
  supports the topology/metric separation. Device-side rendering shifts work;
  client GPU, battery and data are not free.
- **Search grounding:** retrieved context is candidate evidence, not a truth
  guarantee or proof of a provider's current internal pipeline. Public
  [Google AI-features documentation](https://developers.google.com/search/docs/appearance/ai-features)
  is narrower than a claim that every such system uses one exact stack.
- **Production fault testing:** replaced “break prod daily” with bounded,
  authorized hypothesis/monitoring/abort/cleanup requirements. The exercise
  never executes a production fault.

## Copyediting and validation

Fixed merged terms and numeric spacing such as `Independent1%`, `roughly63%hai`,
`exactly2epsilon`, `after200response`, and the artifact-distribution question.
Decimal values, command strings and raw expected console captures were
preserved. No question count, answer index or action identifier was changed.

Validation after the edits:

- `node validate.js`: 24,023 checks passed.
- `node tools/replay-exercises.js`: 967 fixtures passed, each directly and after
  wrong actions; 10,720 intended actions executed.
- `node tools/quiz-quality.js --json`: all 201 reviewed company MCQs have
  per-option feedback and zero length-bias flags.
