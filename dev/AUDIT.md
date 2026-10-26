# System Gurukul audit — 2026-10-23

Local implementation and regression audit of the 14 tracks and 244 levels.
No Docker projects, brokers, cloud resources or app servers were started. No
dependencies were installed, and no commit, push or deployment was performed.

## Exercise correctness

All 52 terminal missions, including the three embedded interview terminals,
have manually authored `solution[]`, current-state `verify(sim)` predicates and
three progressive hints. The replay suite runs the real terminal engine: a
prefix cannot win, the final command must win, and every single-command omission
must fail. It also checks stale measurements, undoing a fix, reset isolation,
plausible wrong fixes, malformed input and unsafe internal paths.

`exercise-solutions.json` contains 967 static action fixtures for the other
stages and interviews. The actual renderers are exercised directly, after wrong
answers, with keyboard activation, and with each individual intended action
omitted. Solutions are authored data, not extracted from hints or generated from
the runtime answer predicate. Renderer callbacks must fire exactly once at the
final intended action; fixtures also check that shared lesson data stays intact.

Notable fixes:

- Four terminal missions previously completed early. Completion now requires
  the full checklist, success predicate and fresh live-state verification.
- Load shedding used to accept an admission rate above actual model capacity;
  the intended fix now bounds admitted work at the original offered load.
- Reusing one classification chip, skipping a failed design review, guessing a
  wildly wrong estimate, clicking every architecture box as flawed, and
  previewing a Docker observation question no longer complete those exercises.
- Knob labs now declare minimum incident workloads. Shrinking the noisy tenant,
  traffic skew, viewer count or slow-node factor cannot substitute for a fix.
  Goals explicitly state inclusive budgets and any required design policy.
- A two-region quorum cannot survive losing either voting region. With equal
  home-region populations, two regional homes also leave only half the users
  writing; the majority goal requires at least three.
- CDC burst catch-up needs capacity above the arrival rate. The displayed
  numeric recovery estimate states its toy burst/headroom assumptions.
- Logical shards improve placement granularity; they do not remove the new
  node's physical data copy. The Instagram lab now models that copy and gives
  an explicit bounded-copy goal.

`tools/tradeoff-test.js` checks all 32 knob labs, 32,000 reproducible states,
17 demand-reduction cheats and explicit regression cases. The main validator
also includes required workload when checking solvability.

## Engine, progress and persistence

Command parsing now guards missing matches, malformed URLs/cursors/headers,
unknown flags, invalid numeric values and structural state corruption. Reset
restores the mission's exact tables and clears history, evidence and token state.
Data helpers are enclosed or under `SD`; `deepAssign` is private to system
presets. The only intentional top-level data bindings are `SD`, `RANKS` and
`VISUALS`.

Storage schema 2 normalizes legacy, corrupt and malformed fields. Blocked or
quota-limited storage leaves the current tab usable and displays saving status.
Stage-boundary checkpoints include fingerprints of complete stage payloads,
including predicate functions; changed questions or checks invalidate stale
resume points. Partial answers and simulator state are not saved.

XP stays pending until the first full level completion. Restarting an unfinished
level replaces its pending attempt; replaying a completed level adds no XP.
Daily pop-question bonuses are deduplicated. One-shot callbacks and view guards
prevent rapid clicks and delayed callbacks from advancing another session.

## Teaching and question quality

All 244 levels map explicitly to 53 topic guides in `data-guidance.js`. Guides
lead with real pain and give one concept, a tiny example, an explicit hands-on
step, use/avoid criteria, comparison, decision tree, common mistake, production
failure mode, interview follow-up and primary references. Historical company
stories and invented model arithmetic are labeled with their scope.

All 1,228 MCQs now have plausible concise alternatives and a reason for each
option. The length rule is the requested visible-text 1.15/0.85 ratio. Questions,
incident decisions and design choices all have zero length flags and no missing
feedback. Source answer indexes remain stable; every MCQ renderer shuffles the
visible options, and design options shuffle too. A seeded shared-shuffle check
samples 12,000 presentations per option count; maximum deviation from even is
2.58% for three options and 1.97% for four. This is a reproducible presentation
check, not a claim about any particular learner's small sample.

Fact corrections include replication durability and ambiguous write outcomes,
transactional processing versus external effects, index-only visibility and
selectivity, token revocation, fan-out independence, spatial candidate filtering,
forward secrecy versus recovery after compromise, sandbox performance limits,
and source/model boundaries in company and outage stories. Relevant statements
were propagated into nearby lessons, cards and feedback.

Primary references and detailed correction notes:

- [Terminal, health, DR, EDA and physics](audit-missions-v2.md)
- [Backpressure, breakers, retries, isolation and randomness](audit-v2-sources.md)
- [Core topics and feed fact consistency](audit-core-facts.md)
- [Gaps, extended topics, CDC and shuffle sharding](audit-gaps-ext.md)
- [First eleven company files](audit-company-first11.md)
- [Remaining company, AI and planet files](audit-company-later.md)
- [Progress, checkpoint and presentation review](audit-progress.md)

## UI and browser checks

Light/dark theme selection persists. Interactive chips, matching cards, bins and
hotspots support keyboard activation; native buttons and sliders retain native
keyboard behavior. Focus is visible, reduced motion is respected, long content
wraps, and phone comparison tables become labeled cards rather than narrow
columns.

Final browser tools use existing Chromium/Playwright, isolated temporary profiles,
local `file://` pages and blocked external HTTP(S). Source hashes are recorded
before and after each run to detect edits during validation.

## Final validation results

| Check | Result |
| --- | --- |
| `node validate.js` | 24,040 checks passed; 45 linked Docker projects structurally checked |
| `node tools/replay-missions.js` | 52 missions; 301 omitted commands; 3,952 malformed inputs; 13,401 checks; 7,802 commands |
| `node tools/replay-exercises.js` | 967 fixtures; 10,726 intended actions across direct/wrong paths; 5,363 individual omitted-action attempts; zero failures |
| `node tools/tradeoff-test.js` | 32 labs; 32,000 sampled states; 17 workload-reduction cheats; 32,947 checks passed |
| `node tools/quiz-quality.js --check` | 1,228 MCQs, 43 incident decisions, 108 design choices; zero length flags, missing feedback or duplicate labels |
| `node dev/state-test.js` | 16 persistence/migration checks passed |
| `node dev/progress-test.js` | 15 progress, XP and checkpoint checks passed |
| Chromium fixture replay | 967/967 passed in light and 967/967 in dark; no console/runtime errors |
| Chromium UI sweep | 3,066 samples at 360px; zero document overflows or narrow guide cells; 6/6 behavior checks passed |
| Computed text contrast | 123,582 samples; zero failures on measured solid surfaces |
| Source stability | Both browser reports have empty `sourceChanged` lists |
| `git diff --check` | Passed |

Machine-local browser artifacts:

- `/tmp/sys-design-gurukul-final-ui/REPORT.md` and `REPORT.json`: screen measurements,
  contrast, keyboard/navigation guards, reload/resume and source hashes.
- `/tmp/sys-design-gurukul-final-ui/`: light/dark home and expanded guide screenshots,
  plus comparison-card viewport screenshots used for visual review.
- `/tmp/sys-design-gurukul-browser-replays/REPORT.json`: every renderer fixture in both themes.
- `/tmp/sys-design-validate-final.log` and `/tmp/sys-design-missions-final.log`: final Node logs.

Visual review confirmed that the phone comparison cards have readable full-width
text. The installed Linux font set displays some emoji as empty glyph boxes in
captures; the content and controls remain labeled with text.

## Verification limits

Terminal and browser performance numbers are deterministic teaching models,
not production benchmarks or current provider pricing/capacity guarantees.
Documented Docker captures were reviewed against local project source; they were
not rerun. The 142 external-lab walkthrough stages require self-reported steps
and a correct observation answer. Their UI explicitly says that completion does
not verify a container, external command or actual measured output.

The automated contrast scan covers visible text on computed solid surfaces;
gradient/image-backed text is reviewed visually. Browser coverage uses isolated
Chromium, not every browser or assistive technology, and is not a WCAG
certification. Exhaustive single-step omissions and targeted wrong paths improve
confidence; they do not prove resistance to every possible action sequence.

Reproduction commands are in [dev/README.md](README.md). New content must retain
the solution, feedback, workload and guide contracts in [EXTENDING.md](../EXTENDING.md).
