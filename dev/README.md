# dev/ — developer tools (the app itself does not load anything from here)

## shots.js — real-browser check of the dry-run screens

Clicks through every `dryrun` / `cards` step of a track (default: `sdd-resil`) in headless Chromium at 390 px and 1280 px,
answers every question correctly (and once wrongly), measures layout problems (overflow, cut-off text, hidden step
counter, label overlaps, on-screen font sizes) and saves screenshots plus a `REPORT.md`.

```bash
node dev/shots.js                          # every level in sdd-resil
node dev/shots.js --track=TRACK_ID         # another track
node dev/shots.js --viewports=390          # phone only
node dev/shots.js --levels=cb-code,cb-lib  # some levels only
node dev/shots.js --track=sdd-eda --levels=ed-kyun,ed-kaise,ed-code,ed-kab
node dev/shots.js --track=fp-core --levels=fp-physics-kyun,fp-physics-kaise,fp-physics-code,fp-physics-kab
node dev/shots.js --out=/tmp/my-shots      # another output folder
node dev/shots.js --app=/path/to/app       # another app checkout
```

Output goes to `<os tmp>/sysdesigngurukul-shots/` (`--out=DIR` to change). It installs and downloads nothing: it
looks for Playwright under `~/.npm/_npx/*/node_modules/` and for Chromium under `~/.cache/ms-playwright/`.
This machine has no colour-emoji font, so emoji appear as empty boxes in the screenshots; that is not an app bug.

`eda-plan.md` records completed EDA coverage, remaining topics, source IDs, and lab capture locations.
`first-principles-plan.md` records the separate 15-video course in numbered order, source corrections and lab 45 evidence.
