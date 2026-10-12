# dev/ — developer tools (the app itself does not load anything from here)

## shots.js — real-browser check of the dry-run screens

Clicks through every `dryrun` / `cards` step of the sample track `naya` in headless Chromium at 390 px and 1280 px,
answers every question correctly (and once wrongly), measures layout problems (overflow, cut-off text, hidden step
counter, label overlaps, on-screen font sizes) and saves screenshots plus a `REPORT.md`.

```bash
node dev/shots.js                          # everything, about 4 minutes
node dev/shots.js --viewports=390          # phone only
node dev/shots.js --levels=cb-code,cb-lib  # some levels only
```

Output goes to `<os tmp>/sysdesigngurukul-shots/` (`--out=DIR` to change). It installs and downloads nothing: it
looks for Playwright under `~/.npm/_npx/*/node_modules/` and for Chromium under `~/.cache/ms-playwright/`.
It is currently written for the `naya` track only (search the file for `naya` to generalise it).
This machine has no colour-emoji font, so emoji appear as empty boxes in the screenshots; that is not an app bug.
