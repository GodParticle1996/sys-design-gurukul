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
| 2 | Engine and code review: simulator, renderers, app shell, test tools; tests for each fix | open |
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
