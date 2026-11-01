# System Gurukul — full review (started 2026-10-29)

Checkpoint for a phased review of the whole app. Read this first when resuming; update it at the end of every
phase. Earlier audit: [AUDIT.md](AUDIT.md) (2026-10-23, commit `485a881`).

## User decisions (2026-10-29)

1. **Answer options read as natural Hinglish, with balanced lengths.** Write simple Hinglish sentences. Keep the
   no-length-hint rule (`tools/quiz-quality.js`) by making the wrong answers as long and believable as the right
   one, never by clipping the right one. An option must not use a term before the lesson has named it. Every
   option keeps a short reason (`choiceExplanations`), also in simple Hinglish.
2. **Decision guides (`data-guidance.js`, 53 guides) become an end-of-level recap.** Rewrite them analogy-first in
   simple Hinglish and show them after the level, not on the intro. Cut intro disclaimers to one short line where
   one is needed.
3. **Git: local commit after each phase or track; ask before every push** (a push deploys the live site).
4. **Review only.** Do not build new First Principles or EDA topics in this job.

## Baseline (2026-10-29, before any change)

All seven suites pass on Node v24.18.0:

| Suite | Result |
| --- | --- |
| `node validate.js` | 24,040 checks |
| `node tools/replay-missions.js` | 52 missions, 13,401 checks |
| `node tools/replay-exercises.js` | 967 fixtures |
| `node tools/quiz-quality.js --check` | 0 flags |
| `node tools/tradeoff-test.js` | 32 labs, 32,947 checks |
| `node dev/state-test.js` | 16 |
| `node dev/progress-test.js` | 15 |

Size: 14 tracks, 244 levels, 1,016 stages, 45 lab projects, about 66k lines of JS.

Style measurement, all 244 levels, pre-audit tree `ce2f297` versus now:

| Text | Count (old → now) | Avg words | Hinglish function-word share | Telegraphic `X; Y` |
| --- | --- | --- | --- | --- |
| Answer options | 5,282 → 5,282 (all rewritten) | 9.9 → 6.6 | 37.1% → 14.3% | 6.9% → 20.4% |
| Explanations | 2,717 → 7,570 (+4,853 per-option reasons) | 22.4 → 17.9 | 38.2% → 29.8% | 7.4% → 25% |

## Phases

| # | Phase | Status |
| --- | --- | --- |
| 1 | Quick fixes: README/docs breakage, stale counts, rendering bugs, validator guards | ✅ done 2026-10-29 |
| 2 | Engine and code review: simulator, renderers, app shell, test tools; tests for each fix | ✅ done 2026-10-29 |
| 3 | Content, track by track: language (decision 1), guides (decision 2), teaching order, facts | open |
| 4 | Browser pass: phone and desktop screenshots, layout fixes | open |
| 5 | Wrap-up: docs, notes, commits | open |

## Findings log

### Phase 1 — done 2026-10-29

Fixed:

- **README.** A blank line split the track table, so every row from 📡 Feed onward rendered as plain text. Stale
  rows now list the newer levels: cache invalidation, backpressure, replication, replica ≠ backup, chaos, lock
  choices, CrowdStrike 2024 and Datadog 2023. The lab table now gives real usage (replay 12 levels, tradeoff 32,
  estimate 22, archdiff 13); it said "5 postmortems", "5 levels" and so on.
- **`gallery.html` showed 94 of 244 diagrams.** It loaded only `visuals.js`, but 150 diagrams live in the content
  files. It now loads the app's scripts (minus `app.js`) and groups the diagrams by track, in level order, with
  level titles. Chromium check at 390 px: 244 diagrams, 14 headings, 0 errors, 0 overflow.
- **Text the browser swallowed.** A tag-like word the browser doesn't know is dropped along with its text. Three
  cases:
  - `versioning`: `Link: </docs/migrate>` showed as `Link: ;`.
  - `ids`: the chip read `/invoices/`.
  - `media`: `PUT <upload_url>` showed as `PUT `.

  All three are escaped now.
- **Fact fix in the same example.** It used `Deprecation: true`, from an old draft; RFC 9745 makes the value a
  structured date (`Deprecation: @1793491200`). The Sunset date, 1 Nov 2026 (three days away), is now 1 May 2027.
- **Validator guards** (`validate.js`, 24,530 checks):
  - any unknown or unbalanced tag in a level string or diagram fails;
  - `index.html` must load exactly `ENGINE + CONTENT`, in order (only one direction was checked before);
  - `gallery.html` must load the same scripts as `index.html`, minus `app.js`.
- The Uber boss diagram had the same title as the Shapes boss; it is now distinct.

Checked and fine:

- All 45 lab folders are listed in `docker-labs/README.md` and have READMEs.
- All 480 lab JS files pass `node --check`; the test suites of labs 44 and 45 pass (5/5 each).
- All 46 public links shown in the app return 200. The other 45 are `localhost` lab URLs.

Carried forward:

- **Phase 2:** `SD.makeInteractive` builds aria-labels by stripping tags but not decoding entities, so a screen
  reader hears `&lt;id&gt;` literally.
- **Phase 3:** the four `fp-physics-*` levels share one placeholder hero diagram, and so do the four `ed-*` levels.
- **Phase 3:** the `blast` lesson credits "(AWS $200B video)", but the app must stand alone.
- **Phase 3:** the audit's rewrite script left 1,181 misindented lines, and very long lines doubled
  (1,484 → 3,261). Those are the option and reason lines Phase 3 rewrites, so the formatting gets fixed then.

### Phase 2 — done 2026-10-29

Read in full: `core.js`, `data-core.js`, `app.js`, `games.js`, `canvas.js`, `labs.js`, `explain.js`, `dockerlab.js`.
In `perfsim.js` I read the cost and load models, the terminal loop and the formula labs (Bloom, HLL, IDs,
network). The replay suite already fuzzes its command handlers (3,952 malformed inputs).

The models check out: the M/M/c pool wait (Sakasegawa), Little's Law, left-most-prefix index matching, Bloom
m/k/fp and HLL 1.04/√m.

Fixed:

- **Raw `<b>` tags in the terminal (since the first upload).** `print()` wrote everything with `textContent`, so
  68 of the 72 explanation lines showed literal `<b>`/`<code>`. Explanation lines now render a whitelist (b, i,
  code, br); echoed commands and all other output stay plain text. Checked in Chromium.
- **Admission control mixed concurrency and rate.** The flag and `sim status` said "concurrent", while the model,
  the confirmation and `load` meant requests per second. That matters because the app teaches Little's Law. It is
  now `--max-rps` everywhere: 4 missions, help text, status, tests, and the ticket-booking explanation.
  `--max-concurrent` now fails with a message explaining the rate-versus-concurrency difference.
- **TLS 1.2 numbers labelled as TLS 1.3.** `net trace` and `net compare` assumed 2 RTT for TLS, while the lesson
  said "TLS 1.3 par 1 RTT". New `--tls 1.2|1.3` flag, default 1.3. Cold setup is now 110 ms (150 ms with
  `--tls 1.2`), and `compare` gives 630 / 192 / 152 ms; `--tls 1.2` reproduces the old 670 / 232 / 152. QUIC rejects
  TLS 1.2. The lesson table, flashcard, Feed bin item and README are updated, plus two overstatements:
  - "sprite sheets ab nuksaan" is now softened;
  - L4 load balancers can terminate TLS (AWS NLB).
- **Sample IDs.**
  - `id gen uuid4` randomized the version and variant digits; samples are now valid v4.
  - ULIDs were 25 characters; now 26.
  - Snowflake samples were past `Number.MAX_SAFE_INTEGER`, so the sequence bits rounded away; they now use BigInt
    and count up.
  - The `id bench` text had a sentence spliced by the audit; rewritten.
- **Docker stages (user decision 2026-10-29).** The observation question finishes the stage. "Laptop paas nahi"
  opens every step's captured output. Ticking every step records the lab in `state.labsDone` (key
  `project/exercise`). Completed levels with labs not yet run show "🐳 N lab baaki" on the map, and their intro
  has buttons that open each lab stage directly. Tests are updated: fixtures mark step ticks `optional`, and the
  skip path, ticks-only path and storage round trip are tested. Played end to end in Chromium.
- **Decision guides moved from the intro to the level-complete screen** ("📒 Yaad rakhne layak"). The intro's XP
  and case-study disclaimers are now one short line each, and the interview note only shows when there is an
  interview. Their content is rewritten in Phase 3.
- **Accessibility.** `SD.plainText()` (strip tags, decode entities) now builds every aria-label; screen readers
  heard `&lt;id&gt;` before.
- **Text.**
  - The home hero and resume card are rewritten in plain Hinglish.
  - The certificate sentence had no subject ("ne … jeet liye").
  - The Feed blurb named a Slack postmortem that doesn't exist and left out CrowdStrike and Datadog.
  - The Builds blurb said "saat" systems and listed six; there are eight.
  - The stale header comment in `core.js` is fixed.
- **Estimate lab** now understands hazaar, million, arab, billion and plurals (14 parser cases tested).
- **Cleanups:** dead code in `depCost` and in the tradeoff win branch.

Deferred, at the user's request: **XP fairness and the rank ladder.** The design canvas, the four labs, the dry
runs and the Docker stages award no per-answer XP, and the top rank arrives at 39% of the app's 44,100 maximum XP.
A self-contained brief for another agent is in [TASK-xp-and-ranks.md](TASK-xp-and-ranks.md).

**Done 2026-10-29 by Codex as a sub-agent** (commit `3fc501a`, see below): every renderer awards 10 XP per first-try
answer (max 50,940 XP); ten new ranks end at System Samrat 🔱, 48,000 XP (94%). Claude's review found one gap outside
Codex's file scope — the topbar still said "MAX RANK 👑" — fixed in `29f6326`.

### Working with Codex (from 2026-10-29)

The user runs terminals in herdr; Codex CLI in terminal 1 (pane `w5:p1`, named `codex1`) works as a sub-agent.
User's rules: cross-review both ways; Codex at high reasoning (ask before max). Setup: Codex works in its own git
worktree `../sdg-codex-xp` (branch `codex/<task>`), never commits or pushes; Claude reviews the diff, reruns every
suite, then commits and merges. Briefs go in as files; reports come back as `CODEX-*.md` in the worktree.

| Job | Who wrote | Who reviewed | Result |
| --- | --- | --- | --- |
| XP & ranks (brief: TASK-xp-and-ranks.md) | Codex, ~12 min | Claude: diff read, 8 suites rerun, topbar checked in Chromium | merged `3fc501a`; follow-up fix `29f6326` |
| Phase 3 rewrite: cb-kyun … cb-kab, rt-kyun | Claude | Codex: 18 findings, 1 P1 | all 18 fixed after Claude checked each against the code and lab READMEs |
| Phase 3 rewrite: rt-kaise, rt-code | Claude | Codex: 8 findings (7 P2, 1 P3) | all 8 fixed after checking `lib/retry.js` and the README trace; 3 more found while fixing |
| Phase 3 rewrite: rt-lib, rt-kab | Claude | Codex: 9 findings (5 P1, 2 P2, 2 P3) | all 9 fixed; Codex checked p-retry 8.0.1's tagged source |
| Phase 3 rewrite: bp-kyun … bp-kab | Claude | Codex: 20 findings (9 P1, 10 P2, 1 P3) | all 20 fixed (2 differently, see below), plus step text, cards, lab tool label and README |
| Phase 3 rewrite: nn-kyun … nn-kab | Claude | Codex: 14 findings (6 P1, 7 P2, 1 P3) | all 14 fixed (3 differently, see below), plus step text, a card, a flashcard and 2 README lines |
| Phase 3 rewrite: rn-kyun … rn-kab (26 MCQs) | Claude (Raft lab rerun: 409–1053 ms failovers, 119–125 elections) | Codex: 9 findings (3 P1, 6 P2) | all fixed (1 differently); `tools/election.js` crash and timeout-as-failover fixed |
| Phase 3 rewrite: ch-kyun … ch-kab (39 MCQs) | Claude | Codex: 7 findings (2 P1, 5 P2) | all fixed; the p99 wording fix also swept Randomness, Noisy Neighbour and two lab READMEs |
| Phase 3 rewrite, core track Flow (10 levels, 48 MCQs + 9 incident/design labels) | Claude | Codex: 20 findings (7 P1, 12 P2, 1 P3) | all fixed, plus the lifecycle lesson that repeated the 20 ms overclaim |
| Tool: `dev/rewrite/labels.js` | Claude | Codex (in the API review) | rewrites incident `t` and design `label` texts with the same checks as `apply.js` |
| Phase 3 rewrite, core track API (11 levels, 40 MCQs + 6 design labels) | Claude | Codex: 14 findings (3 P1, 10 P2, 1 P3) + 2 bugs in `labels.js` | all fixed; `labels.js` now finds a node by its whole label sequence and applies edits from the end |
| Phase 3 rewrite, playlist First Principles (fp-physics-*, 33 MCQs) | Claude | Codex: 1 P1, 6 P2 | all fixed; five yes/no questions became concrete predictions (Codex's wording) |
| Yes/no polarity sweep (52 MCQs in Concurrency, First Principles, EDA, Chaos, Flow, API) | Claude, after Codex's fp finding | — | the right option alone started with "Nahi" and every distractor with "Haan"; prefixes stripped, `apply.js` now rejects the pattern |
| Phase 3 rewrite, playlist EDA (ed-*, 26 MCQs) and core track Resilience (16 levels, 76 MCQs + 20 incident options) | Claude | Codex: 15 findings (6 P1, 8 P2, 1 P3) | all fixed. P1s: burn-rate math (99.9 % / 30 d: 2 % for 6 h = 16.7 % of budget, not the month), mean ≠ median, deadline vs fixed budgets, flashcrowd CDN contradicted its lesson. Two done differently: the outbox name left the `ed-kab` answer instead of adding a card (ed-code's feedback already teaches it); boss-resil incident got an evidence-based sitrep. `apply.js`/`labels.js` now also catch "ise" and "usi/isi" + postposition; new `dev/rewrite/locate.js` finds a question by its opening words |
| Phase 3 rewrite, core track Dist (16 levels, 77 MCQs + 3 incident nodes + 6 design slots) | Claude | Codex: 11 findings (6 P1, 4 P2, 1 P3) | all fixed. P1s: idempotency was offered as a substitute for fencing (Codex reproduced it on lab 36's ledger: tokens 33 then 34 still double-charge); consensus-split named node 3 instead of node 5 as the y = 30 leader; Spanner commit-wait described as a fixed sleep after commit; p99 treated as every request's latency; "sirf DB constraint atomic hai". The saga lesson's "3 se zyada steps? Orchestration" rule was rewritten to "flow ki complexity dekho" in the lesson, bins and match items too. New tools: `dev/rewrite/standins.js` (lists every stand-in in a level, lessons included), `replace.js` (exact, all-or-nothing text fixes) and the shared `standin-re.js` |
| Phase 3 rewrite, core track Shapes batch 1 (classify, search, media, realtime, geo: 31 MCQs, 19 design/incident label sets, 59 lesson stand-ins) | Claude | Codex: 6 findings (5 P1, 1 P2) | all fixed: B-tree later columns are checked in the index (PostgreSQL docs), a plain presigned PUT does not cap size (lesson, step, tip and flashcard said it did), a search cache can be stale while product pages are fresh, outbox/CDC "kuch kho nahi sakta" removed, strong visibility ≠ 5 crore sync inbox writes; Instagram distractors now differ in one classification each |
| Phase 3 queue: rest of Shapes → Builds → Feed → Stories → AI → Planet (122 levels) | Codex at xhigh, one long queue job (user's choice, 2026-10-31: spend Codex's remaining weekly quota first) | Claude | patches in sdg-codex-xp/jobs/queue/, one set per level, all --dry checked |
| Queue batch 1: Shapes rest (ledger … boss-shapes) + all 9 Builds levels — 81 MCQs, ~150 label sets | Codex | Claude: facts and wording read; 28 MCQs reworded where every wrong option carried a "chhod do / baad mein / hamesha" tell (now an `apply.js` check); Codex's lesson-text edits NOT applied (they flattened stories and examples into jargon) except 6 real fact fixes (boss-uber 15 lakh → 1.5 crore writes/min, ticketmaster "kuch hazaar" vs 200 seats, crawler 6.2 machines + headroom, adclick simulator %, shard key and local-call overclaims); 48 lesson stand-ins fixed phrase-level by Claude | applied; all suites green |
| Phase 4: phone top bar (4 rows/154 px → 2 rows/88 px, real height in --topbar-h + scroll-padding) and code-pane wraps (tab indent, tab-size 2 on phones, hanging indent) | Claude | — | committed b3061da; the shots.js top-bar finding is gone. Still open: SVG labels 10.5 px at 390 px |
| Phase 3 rewrite, core track Data batch 1 (modeling … caching, 33 MCQs) | Codex | Claude: options read in full, "had" → "hadd" | applied; Codex's MCQ fact fixes kept; 9 lesson/flashcard overclaims Codex listed fixed by Claude |
| Phase 3 rewrite, core track Data batch 2 (stampede … boss-data, 48 MCQs) | Codex | Claude: spot-read, "had" → "hadd" | applied; Codex's style is denser and more English-heavy than mine — ask for simpler wording next time. Its 7 outside-MCQ findings fixed by Claude |
| Phase 3 rewrite: dr-kyun … dr-kab (45 MCQs) | Codex (second writing job, ~20 min) | Claude: timings checked against `tools/slowmo.js`, options read in full | applied (one word changed); Codex's 3 MCQ fact fixes kept, and its 3 step-text/flashcard findings fixed |
| Tool: `dev/rewrite/scan.js` | Claude | — | per-track count of clipped-English strings; undercounts (options with glue words still read clipped), so treat it as a floor |
| Phase 3 rewrite: hc-kyun … hc-kab (40 MCQs) | Codex (first writing job, ~20 min) | Claude: every option checked against `lib/health.js`, `lib/checker.js`, the README traces and the AWS/Kubernetes defaults | applied with light wording fixes; Codex also found 2 wrong step texts and a `slowmo-boot.js` bug, all fixed |
| New Concurrency track (6 levels, Java lab 46) — the user asked Codex directly | Codex, ~37 min | Claude: shared-file diff, Java code, 24 + 42 checks rerun, browser pass at 390/1280 (0 broken) | merged as-is; language rewrite + real hints next (all 51 hints were one boilerplate line) |
| Concurrency language pass: cc-start … cc-workers (51 MCQs, 51 new hints) | Claude | Codex: 16 findings (2 P1, 12 P2, 2 P3) | all 16 fixed (3 differently, see below); `apply.js` now also patches `ask(q, choices, reasons, hint)` calls |

What Codex's review caught (all confirmed before fixing):

- **P1 · `cb-code`:** the marked answer said an OPEN breaker "ginta rahega" without line 11. Wrong: `record()` returns
  while OPEN, and without `allow()` the breaker never leaves OPEN.
- **Wrong numbers:** 300 → 30 calls was timeout vs timeout + breaker, not retry. Backoff *does* cut calls (132 → 30).
  The six phones return across 100 ms, not one instant.
- **Giveaways:** every wrong option said "badha do" under a "ghatani" stem; only the right option named the new term
  (retry storm, jitter); one wrong option used "cache" before the lesson named it.
- **Stems that allowed other answers:** "feature band karo" and "retry hata do" were valid unless the stem ruled them
  out; interview stems now carry one observable clue instead of stating the answer.
- **Reasons with false absolutes:** "window sirf OPEN par saaf", "timer ke baad trial apne aap jaati hai", "error
  sirf network toote par".

Second round (rt-kaise, rt-code):

- **False claims in reasons:** "sirf line 22 loop rokti hai" (lines 20 and 21 also return); "random wale phones ki
  koshish ki ginti wahi thi" (30 vs 28 calls; Asha and Chitra won on try 4); "server ko pata hai kab jagah hogi"
  (`fragile.js` always sends a fixed `retry-after: 1`); "full jitter ausatan sabse accha" (the README ranks nothing).
- **Off-by-one in `n`:** "n = ab tak ki failures" makes the first bound 600 ms. `n` is the try number from 0. The
  same slip was in the lab comment (`lib/retry.js:4`), the code shown in rt-code and its dry-run label; all fixed.
- **Teaching order:** a distractor in rt-code stage 1 used fetch's Response before stage 2 teaches it.
- **Giveaways:** only the right option contained "Retry-After" or a full status list. The overload interview now
  mixes server-side mistakes (200 with the header in the body, a silent dropped connection) with client-side ones.
- **Not adopted:** Codex's version of two questions gave all four options the same prefix, differing only in
  "n = 0 or 1". Kept real misconceptions instead (random once, no cap, one fixed wait).

Third round (rt-lib, rt-kab) — 4 of the 5 P1s were inherited text that the rewrite kept without re-checking:

- **Retries vs attempts:** "default 10 koshish" — p-retry's default is 10 *retries* = 11 tries, which the level itself
  teaches two stages earlier.
- **p-retry 8 does not retry everything:** AbortError and a non-network TypeError stop it. Fixed in the question,
  the dry-run step and the lab README row ("default: har error par").
- **Waves are cumulative:** waits of 1, 2, 4 s put the walls at t = 1, 3, 7 s, not 1, 2, 4 s (stem, hint, options).
- **Units:** the budget row's 1,004 is failed *actions*, not users (question, table header, step text, flashcard).
  The no-budget row's "0 errors" hides 50 actions still unfinished when the run ended.
- **Overclaims:** "the worker and connection stay held for 17 minutes" (an awaited timer pins neither); an
  Idempotency-Key protects only within the provider's retention window.
- **Checker:** `apply.js` now also flags unka/unki/unke/unko/inko. "usi/isi + noun" ("isi wajah se", "usi din")
  stays allowed: the noun is named.

Fourth round (bp-*) — most P1s were claims stronger than the lab measured:

- **Async put():** `put()` returns a pending Promise at once; `sender()` waits at `await`. "put() lautata nahi" was
  wrong in the question, the dry-run step and the interview.
- **What was measured:** 70,826 rejections is a count, not "most of the time spent rejecting"; `--max-old-space-size`
  caps the V8 heap, not process memory (RSS was ~155 MB); `say()`'s cost was never measured; equal 3.75 s / 8.0 s
  totals hold for this lab, not every workload; the in-memory reader leaked no file or socket (tool label fixed too).
- **Library facts:** quorum queues have no `reject-publish-dlx`, and dead-lettering needs a configured exchange;
  Kafka clients prefetch records (`max.poll.records` only sizes one poll), and pausing on the poll thread while
  processing for 7 minutes does not keep polling; drain fires every round (1.35, 2.55, 3.75 s).
- **Ambiguous stems:** "5% per second" now reads 5 jobs/s of 100; interviews now give the evidence the answer needs
  (growth rates, pending handlers, the client's 503 policy).
- **Not adopted:** Retry-After counts as known (the Retries topic teaches it first), so only the wait wording
  changed (the lab client waits 0.8–1.2 × retry-after-ms). The "disable animations" distractor was replaced, since
  the lab model has no animations.

Fifth round (nn-*) — 2026-10-30, after a fresh Codex conversation (the old one was 70% full):

- **Numbers the rewrite got wrong:** fair queuing *did* cut failures in the "average" scenario (FIFO 138, quota 148,
  fair 43), so "baari-baari ne fail ghataye nahi" was false (interview, true/myth item). The token bucket keeps
  0.2 tokens from the step before, so 10.2 is capped at 2 and 8.2 spill, not 8. Pool and fair both do 9.50 s of work,
  so "alag khidki mein kul kaam kam hua" was false; only Annapurna finishes later (7.00 vs 5.02 s).
- **Inherited from the README:** "200 mein se 140 khaali" — 140/s is what B + C leave over, before counting A. With A
  capped at 80/s about 60/s sat idle (fair queuing gave A 1,046 vs 721). Fixed in step text, a badge, a table, a
  myth, an interview and README line 262.
- **Kubernetes QoS:** the card, flashcard and myth said evictions go BestEffort → Burstable → Guaranteed. The kubelet
  ranks by usage over request, then priority; the docs say the QoS class only *estimates* the order.
- **Invented or invalid reasons:** a "microseconds" scheduler cost the lab never measures; windows "busy the whole
  time" (9.50 of 15 s); "no errors after scaling, so workers were not reduced" (the code only ever adds workers —
  that is the reason now); "3 workers hamesha khaali" (they *can* serve users).
- **Stems:** "Agli baari Bholu Dhaba ki hai" gave the answer; now the learner works out the turn from who was served.
- **Not adopted as written:** Codex's nn-kyun fix used "token" and "baalti", which only nn-kaise teaches, so the
  option says "hadd ki raftaar se" instead. For two interviews Codex put the cause into the stem; the stems now close
  the loophole only ("network trace theek aaya", "wahi IP, wahi API key") and the distractor that the loophole made
  valid was replaced.
- **Tool:** `dev/rewrite/merge.js` turns small fixes (one reason, one stem) into full `apply.js` items from the
  current data, so untouched options are never retyped.

Sixth round (cc-*, the language pass on Codex's own track):

- **P1 · a lock is not a rollback:** "dono ko ek hi lock mein rakho" was offered as "dono ya koi nahi". A common lock
  only hides the half-done state from threads that take the same lock; an exception after the first change still
  leaves it changed. All-or-nothing needs a transaction or an undo rule.
- **P1 · JDBC query timeout:** "sirf query rokta hai" — the driver only promises it *attempted* to cancel.
- **Teaching order:** cc-start's interview used "race" (taught in cc-race) and prescribed locks and transactions;
  hints and reasons used "lease", "parallelism", "per-key compute", "deadlock" and Node's `write(false)` before
  their own level named them. A `final` question had no `final` in the card; the card now defines it.
- **Silly distractors:** "a new core joins on every switch" (the stem says one core), "print the free-list count",
  "two routes rewrite the third route's code".
- **"Hamesha ke liye atke":** the demo interrupts both threads and unlocks in `finally`, so the answer now says
  "bahar se koi na chhudaaye toh".
- **Not adopted as written:** Codex's transfer fix taught lock ordering in the card right before the question that
  tests it; the question now tests only "both accounts need locks", and the ordering rule moved to the explanation
  as a pointer to cc-stuck. Codex's cc-start distractor "processes cannot reach the same row" contradicted its own
  stem; replaced with "separate connections don't touch each other's work".
- **Open:** cc-race teaches six ideas; Codex independently recommends the same split (race + mutex + atomic / lock
  size + reentrant + immutable). Waiting for the user. The track's step text is still English-heavy ("CPU work, I/O
  wait aur shared bottleneck alag dekho"); a step-text pass is still to do.

Seventh round (hc-*) — the first batch Codex *wrote* and Claude reviewed:

- **Quality:** every marked answer and number held up (the 4.0–5.0 s and 18.5 → 2.5 q/s from the README tables,
  ALB's 5 × 30 s recovery vs one pass for a new target, Terminus's 503 on `/livez`). Codex kept the audit's caveats
  (recorded run, docs calculation not measured on AWS) and widened stems that had loopholes (the ALB target type).
- **Claude's edits:** code names capitalised at sentence starts (`Ready()`, `DepOk`) lowercased; six stiff phrases
  made conversational ("Zinda hone ke sawaal par … niyam restart hai" → "\"Zinda ho?\" lagataar teen baar fail ho,
  toh checker restart karta hai"). Codex's originals stay in `jobs/patches/hc-*.json`; the applied copies are
  `hc-*.applied.json`.
- **Found by Codex outside the questions:** the startup step said "30 'nahi' tak koi restart nahi" — the 30th
  consecutive failure *is* the restart (`checker.js:38–46`). A recap card made fail open a condition for a strict
  dependency in readiness; it is a separate routing choice. `tools/slowmo-boot.js` returned on every failed startup
  probe before its restart branch, so a boot longer than the allowance never restarted; fixed, published output
  unchanged byte for byte, and a 5-failure copy restarts on the 5th failure.

Eighth round (rn-*) — the P1s were Claude's own overclaims:

- **"Koi lambi lane mein nahi jaata":** comparing two lanes avoids only the longer of the *sampled* two; both can be
  long. **"Baar-baar takraav nahi":** each Raft round's collision chance stays the same; only a long *run* of
  collisions is unlikely (Raft §5.2 says "reduced likelihood"). **"Alag CPU → ek server hamesha bhara":** different
  capacity does not mean permanent saturation.
- **Stems with loopholes:** a slow disk can also cause timeouts (and NGINX `max_fails`), so the stem now says every
  request returns before the timeout; the least-connections answer now fits both the lab (requests) and NGINX
  (connections); "kab random NAHI" became four concrete situations with one affinity case.
- **Lab tool:** `tools/election.js` averaged a 15 s "no leader" timeout as if it were a failover; now it prints the
  failed round and averages only completed ones.
- **Not adopted:** a long extra clue in the CPU-herding stem; the stem already shows the server-by-server rotation.
- **Measured today:** the Raft lab's numbers move with machine load (random failovers 409–1053 ms, averages
  442–684 ms; equal timeouts 119–125 elections against the recorded 103–105), so the levels now word them loosely.

Ninth round (dr-*), Codex writing — fact fixes Codex made inside the questions: `orders` in `lib/replicator.js` is a
Map, not an array; A *is* killed in both real-time sync runs (the 75 failures are the 1.0–2.5 s window before the
kill); the warm-standby question needed "B takes no ordinary traffic" to rule out active-active. Outside the
questions, fixed by Claude after checking the code: async replication *can* lose nothing (the batch may have
drained), so "zero nahi hota / hamesha jaata / zero kabhi nahi" became "zero ki guarantee nahi"; 500 ms × 3 is not
a hard upper bound for the real router (a silent endpoint adds the last check's 300 ms timeout); and an error does
not prove the order never happened, so the flashcard now says to retry with the same order number.

Tenth round (ch-*) — "sabse dheemi 1% ko 515–517 ms lage" described a p99 value as if every slow request took
that long; the slowest 1% took *at least* that long, and the hypothesis example "sabse dheemi 1% 200 ms ke andar"
bounded the maximum. The plain phrase stays (the playlist never teaches "p99") but now reads "X ms ya zyada", and
the same fix went through Randomness, Noisy Neighbour and the lab 39/41 READMEs. Also fixed: "wahi chot wahi
nateeja degi" (real timers vary); "dono bekaar" (rollback alone still ends the fault on schedule); finally *calls*
rollback, it does not guarantee rollback succeeded (also in the level's caption); the Chaos Monkey stem gave the
answer away; an interview whose three distractors were actions while the stem asked for a cause.

Eleventh round (Data batch 1, Codex writing): Codex fixed facts inside the questions (no universal % cutoff decides
seq vs index scan; N+1 happens in REST too; the pool sweep's 256 row had 200 real connections; UUIDv7 is 128-bit,
so it fits neither a 64-bit ID nor a mandated UUIDv4 API). Outside the questions, Claude fixed what Codex listed:
"index tabhi laga jab 90%+ rows kaate" / "30% par seq scan sasta" (no fixed cutoff), "covering = heap kabhi nahi,
2-3x tez" (visibility map), "outage hamesha saturation se" (four places), "cache tab lagao jab teenon sach" and
"write-through: cache hamesha fresh", and "ek bhool = hamesha stale" (TTL or the next write clears it).

Twelfth round (Flow) — the P1s were pre-audit absolutes I had restored because the wording read well: "query
bilkul theek, index lagane se kuch nahi hoga" from one 20 ms sample; "200 bhejna jhooth hai" (201 is right when the
resource exists; a status endpoint's 200 can show a pending state); "QUIC loss sirf usi stream ko" (one packet can
carry several streams); a 98.9% product that assumes independent failures; "aam SELECT kuch lock nahi karta"
(PostgreSQL takes ACCESS SHARE — the point is that a read reserves nothing); a 6.25 rps ceiling from "ek query 8 s"
(only valid if every request holds a connection 8 s, now in the stem). Lesson for the core tracks: the audit's
softening was usually right on facts and only wrong on language — keep the facts, restore only the voice.

Thirteenth round (Data batch 2, Codex writing) — facts Codex fixed in the questions: 5,000 rps is not 5,000
simultaneous misses (a 200 ms rebuild window is ~1,000 arrivals); single-flight is per app process; a 95% hit rate
does not prove the DB falls over; sharding makes cross-shard features costly, not impossible; vnodes do not give a
fixed skew; Redis resharding migrates slots live. Outside the questions, fixed by Claude: the same 5,000-miss claim
and its diagram, "cross-shard JOIN/transaction — gaya" (now "mehnga ya engine par nirbhar"), vnode skew ~1.05x /
~1.01x (lab 34 recorded 1.2x; the in-app simulator's 1.9x → 1.01x is now labelled as the simulator's), rollback "20
second" vs deploy "20 minute" as universal numbers, "full-state events alone make duplicates safe" (needs the
newer-version guard), "757 queries ek saath" (peak was 739) and "83,000 DB queries ek saath" (the tool counts routes,
not DB load) in two READMEs and their cards.

Fourteenth round (API) — P1s: my offset example had insertion and deletion swapped (newest-first: an insert
*repeats* a seen row, a delete *skips* an unseen one); rotating a signing key does not log everyone out — only
rejecting the old key does; 403 does not prove the identity is fine, and new credentials can help (RFC 9110).
P2s: usage metrics cannot see which response field a client reads; 2ⁿ filter combinations do not need 2ⁿ indexes;
"snapshot" was tested but never taught (removed from the questions); distractors that were impossible rather
than tempting (GET "corrupts the browser") were replaced with real mistakes. `labels.js` had two real bugs — a
same-level duplicate label pulled the edit to the wrong node, and a new label equal to another option's old
text re-targeted later edits; the reload check rolled both back, but valid patches failed. Fixed: a node is now
found by its full label sequence in the original source, and all edits apply from the end of the file.

The round also exposed two bugs in `dev/rewrite/apply.js`, now fixed: it could not re-patch an array it had already
rewritten (multi-line form), and when one item changed `q`, `hint` and `explain` together it spliced at stale offsets.
The bad write was caught by the reload check and rolled back; the tool now also runs `node --check` on every file
it writes.

Phase 3 findings logged while reading:

- Every mission's hints were replaced with boilerplate ("Aakhri proof: …", "Near-answer walkthrough"). Rewrite them
  to be specific and progressive.
- There are audit spacing artifacts in explanations: "40 msRTT", "200 msSLO", "hai.1000*0.5 ms=500 ms". Scan for
  them and fix.
- Some options are fully English ("Admission limits load; atomic holds still needed"), and one reason has a garbled
  word, "Admissionright".
- The `ids` level should mention UUIDv7 (RFC 9562, time-ordered, Postgres 18 `uuidv7()`). The simulator could add a
  `uuid7` kind.
- The canvas review reveals the best options; a retry after a failed review can copy them. First-try scoring
  already accounts for this. Keep.
