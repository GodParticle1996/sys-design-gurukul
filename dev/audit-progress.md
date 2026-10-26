# Progress, replay and answer-position review

Independent review of the final local app changes. No containers, services,
network calls, package installs or Git writes were used for this review.

## Progress and content changes

- Partial level XP stays in the active session. The app saves earned XP only
  at challenge boundaries and commits it once the complete level is finished.
  Restarting or reloading a partial challenge cannot collect its rewards again.
- Completed-level replays earn no additional level XP. Pop-quiz bonuses are
  limited to one award per question per local day; the full pop quiz must finish.
- Dojo reveal/review buttons are one-shot. Leaving the screen invalidates their
  old handlers. The stage runner ignores delayed completion callbacks after
  Home navigation, a new session or an already accepted completion.
- A migration defect was reproduced and fixed: the old checkpoint signature
  contained only each challenge's type/title. An added same-title question could
  therefore be skipped by resuming a previously saved boundary. Signatures now
  contain two bounded hashes of each full stage payload, including function
  source. Changed challenge data or predicates invalidate the unfinished run;
  compatible XP, completions, stars and revision cards remain intact. Previous
  title-only checkpoints safely stop offering Resume.
- Browser persistence QA now creates its checkpoint through the actual stage
  runner instead of duplicating the app's signature algorithm.

`node dev/progress-test.js`: **15 checks pass**, including unchanged-payload
resume, same-title new-question invalidation and changed-predicate invalidation.
`node dev/state-test.js`: **16 migration/persistence checks pass**.

## Replay negatives

`node tools/replay-exercises.js`: **967 fixtures pass**, **10,726 intended
actions** across positive and wrong-answer walks, plus **5,363 omitted-step
attempts**. Every intended action is omitted in its own fresh run. None of those
runs may complete. Missing controls after an omitted prerequisite are expected
refusals; unexpected exceptions fail the test. Shared lesson data must remain
unchanged. The omission matrix runs in Node's isolated DOM; separate browser
replays cover positive/wrong paths and the targeted renderer cheats.

The omission run also caught a test-harness state leak: an embedded interview
terminal could reuse the previous fixture's completed handle when a preceding
question had been skipped. Fresh renders now clear that handle and command
actions require the intended terminal to be active.

## Visible answer positions

Source review confirmed shuffling before initial rendering for every MCQ
presentation: quiz, incident, interview, pop quiz, postmortem replay, tradeoff
quiz, dryrun/cards (shared question renderer), and Docker observation. The
original answer index is retained only for matching selections and fixtures.
No initial correct-option class, label or visible source index is emitted.

Design-slot options previously appeared in authored order, making the first
option a positional shortcut. They now use `SD.shuffle(slot.options)` too,
while stable option IDs keep review, scoring and fixtures independent of order.

## Tradeoff review

The shared `SD.tradeoffStatus` gate validates finite, in-range, on-step knob
values and the authored minimum incident workload. A lab wins only when its
numeric check and explanatory verdict both accept the current state. Lowering
traffic below the stated workload cannot unlock completion. Disabled sliders
freeze the accepted configuration while its follow-up question is answered.
