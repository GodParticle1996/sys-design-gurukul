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
| Phase 3 rewrite: rt-kaise, rt-code | Claude | Codex | review pending; not committed |

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
